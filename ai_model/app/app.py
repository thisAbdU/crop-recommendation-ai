from flask import Flask, request, jsonify
import os
import joblib
import pandas as pd
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