from flask import Flask, request, jsonify
import os
import joblib
import pandas as pd
import numpy as np
import requests
from dotenv import load_dotenv, find_dotenv

app = Flask(__name__)

# Load environment variables (robust to working directory differences)
load_dotenv(find_dotenv(), override=False)

# Required input features and their order expected by the scaler/model
REQUIRED_FEATURES = [
    'N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'
]

# Load model and scaler with error handling
model = None
scaler = None
model_load_error = None
try:
    model = joblib.load('model/crop_rec_model.pkl')
    scaler = joblib.load('model/scaler.pkl')
except Exception as exc:
    model_load_error = str(exc)


def _validate_and_prepare_input(payload):
    """Validate JSON payload and return a DataFrame with required columns in order."""
    if not isinstance(payload, dict):
        raise ValueError('Invalid JSON payload.')

    missing = [f for f in REQUIRED_FEATURES if f not in payload]
    if missing:
        raise KeyError(f"Missing required fields: {', '.join(missing)}")

    ordered_values = []
    for feature in REQUIRED_FEATURES:
        value = payload[feature]
        try:
            ordered_values.append(float(value))
        except Exception:
            raise ValueError(f"Field '{feature}' must be a number.")

    df = pd.DataFrame([dict(zip(REQUIRED_FEATURES, ordered_values))])
    return df


def _build_gemini_prompt(env_params, top5_predictions, recommended_crop):
    top5_lines = [f"- {label}: {prob:.4f}" for label, prob in top5_predictions]
    env_lines = [f"- {k}: {env_params[k]}" for k in REQUIRED_FEATURES]
    prompt = (
        "You are an agricultural investment analyst. Given the environmental and soil profile, "
        "provide a concise investor/exporter-focused report covering: market potential, cultivation "
        "requirements, regional suitability, seasonal timing, input costs, expected risks (climate, "
        "pests, logistics), and recommended risk-mitigation strategies. Keep it practical and structured.\n\n"
        "Environmental and soil parameters:\n"
        + "\n".join(env_lines)
        + "\n\nTop predicted crops (probabilities):\n"
        + "\n".join(top5_lines)
        + f"\n\nRecommended crop to focus on: {recommended_crop}\n\n"
        "Write the report in a professional tone for investors/exporters."
    )
    return prompt


def _generate_gemini_report(prompt_text, api_key):
    """Call Gemini (Generative Language API) via REST and return the generated text."""
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY is missing. Set it in a .env file or environment.')

    url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    params = {'key': api_key}
    body = {
        'contents': [
            {
                'role': 'user',
                'parts': [{'text': prompt_text}],
            }
        ]
    }
    resp = requests.post(url, params=params, json=body, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Extract text safely from response
    try:
        candidates = data.get('candidates') or []
        if not candidates:
            raise ValueError('No candidates returned by Gemini API.')
        content = candidates[0].get('content') or {}
        parts = content.get('parts') or []
        texts = [p.get('text', '') for p in parts if isinstance(p, dict)]
        full_text = "\n".join([t for t in texts if t])
        if not full_text.strip():
            raise ValueError('Empty content returned by Gemini API.')
        return full_text
    except Exception as exc:
        raise RuntimeError(f'Failed to parse Gemini response: {exc}')


def get_top_crop_recommendations(model, X_input, crop_list):
    """
    Compute per-crop suitability probabilities, convert to percentages [0, 100],
    and return top 3 crops with rank and rounded percentage.

    Parameters
    - model: Trained classifier with predict_proba
    - X_input: Single-sample features (array-like or DataFrame) shape (1, n_features)
    - crop_list: List of crop names aligned to the model's output order. If None, uses model.classes_.

    Returns dict:
    {
      'predictions': { 'crop': percent_float, ... },
      'top_recommendations': [ { 'crop': str, 'score_percent': float, 'rank': int }, ... ]
    }
    """
    # Normalize input to 2D numpy array
    if isinstance(X_input, pd.DataFrame):
        X_arr = X_input.values
    else:
        X_arr = np.asarray(X_input)
    if X_arr.ndim == 1:
        X_arr = X_arr.reshape(1, -1)

    # Get probabilities. Handle both multiclass (n_samples, n_classes)
    # and list-of-arrays from some multilabel/OvR setups.
    proba = model.predict_proba(X_arr)
    if isinstance(proba, list):
        # Expect a list of arrays per class; take positive-class column where present
        pos_cols = []
        for cls_proba in proba:
            arr = np.asarray(cls_proba)
            if arr.ndim == 1:
                pos_cols.append(arr)
            else:
                # Take column 1 if available, else column 0
                col_index = 1 if arr.shape[1] >= 2 else 0
                pos_cols.append(arr[:, col_index])
        proba_matrix = np.vstack(pos_cols).T  # shape (n_samples, n_classes)
    else:
        proba_matrix = np.asarray(proba)  # shape (n_samples, n_classes)

    if proba_matrix.ndim != 2 or proba_matrix.shape[0] < 1:
        raise ValueError('predict_proba returned unexpected shape')

    sample_proba = proba_matrix[0]

    # Determine crop order
    if crop_list is None:
        if hasattr(model, 'classes_'):
            crop_list = [str(c) for c in model.classes_]
        else:
            raise ValueError('crop_list is required when model lacks classes_')

    if len(crop_list) != sample_proba.shape[0]:
        raise ValueError('Length of crop_list does not match number of probability outputs')

    # Convert to percentages and clamp
    predictions_percent = {}
    for crop_name, prob in zip(crop_list, sample_proba):
        pct = float(prob) * 100.0
        if pct < 0.0:
            pct = 0.0
        elif pct > 100.0:
            pct = 100.0
        predictions_percent[str(crop_name)] = pct

    # Top 3
    sorted_items = sorted(predictions_percent.items(), key=lambda kv: kv[1], reverse=True)
    top_three = []
    for rank, (crop_name, pct) in enumerate(sorted_items[:3], start=1):
        top_three.append({
            'crop': crop_name,
            'score_percent': round(pct, 1),
            'rank': rank,
        })

    return {
        'predictions': predictions_percent,
        'top_recommendations': top_three,
    }


@app.route('/predict', methods=['POST'])
def predict():
    # Ensure model is available
    if model is None or scaler is None:
        return (
            jsonify({
                'error': 'Model or scaler failed to load',
                'details': model_load_error
            }),
            500,
        )

    # Ensure model supports predict_proba
    if not hasattr(model, 'predict_proba'):
        return (
            jsonify({'error': 'Model does not support predict_proba()'}),
            500,
        )

    try:
        payload = request.get_json(silent=True)
        if payload is None:
            return jsonify({'error': 'Invalid or missing JSON body'}), 400

        input_df = _validate_and_prepare_input(payload)

        # Scale input and predict
        try:
            X_scaled = scaler.transform(input_df)
        except Exception as exc:
            return jsonify({'error': f'Scaling failed: {str(exc)}'}), 500

        try:
            predicted_label = model.predict(X_scaled)[0]
            proba = model.predict_proba(X_scaled)[0]
            classes = getattr(model, 'classes_', None)
            if classes is None:
                return jsonify({'error': 'Model classes_ attribute not found'}), 500
        except Exception as exc:
            return jsonify({'error': f'Model prediction failed: {str(exc)}'}), 500

        # Build full probability distribution
        predictions_dict = {str(label): float(prob) for label, prob in zip(classes, proba)}
        # Top 5 for the report
        top5 = sorted(predictions_dict.items(), key=lambda kv: kv[1], reverse=True)[:5]

        # Build Gemini prompt and call API
        gemini_report = None
        try:
            api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
            prompt_text = _build_gemini_prompt(payload, top5, str(predicted_label))
            gemini_report = _generate_gemini_report(prompt_text, api_key)
        except Exception as exc:
            gemini_report = (
                f"Gemini report unavailable: {exc}. "
                "Please verify GEMINI_API_KEY and network connectivity."
            )

        return jsonify({
            'recommended_crop': str(predicted_label),
            'predictions': predictions_dict,
            'report': gemini_report,
        })

    except KeyError as exc:
        return jsonify({'error': str(exc)}), 400
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'error': f'Unexpected error: {str(exc)}'}), 500


if __name__ == '__main__':
    app.run(debug=True)