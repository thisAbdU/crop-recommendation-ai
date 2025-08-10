from flask import Flask, request, jsonify
import os
import joblib
import pandas as pd
import numpy as np
import requests
from dotenv import load_dotenv, find_dotenv
import json
from datetime import datetime
import json
from datetime import datetime

app = Flask(__name__)

# Load environment variables (robust to working directory differences)
load_dotenv(find_dotenv(), override=False)

# Conversation thread management system
class ConversationThread:
    def __init__(self, zone_name, max_messages=50):
        self.zone_name = zone_name
        self.messages = []
        self.max_messages = max_messages
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
    
    def add_message(self, role, content, timestamp=None):
        """Add a message to the conversation thread."""
        if timestamp is None:
            timestamp = datetime.now()
        
        message = {
            'role': role,  # 'user' or 'assistant'
            'content': content,
            'timestamp': timestamp.isoformat()
        }
        
        self.messages.append(message)
        self.last_activity = timestamp
        
        # Keep only the last max_messages to prevent memory issues
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]
    
    def get_context_summary(self, max_context=5):
        """Get a summary of recent conversation context for the AI."""
        if not self.messages:
            return ""
        
        recent_messages = self.messages[-max_context:] if len(self.messages) > max_context else self.messages
        
        context = f"Recent conversation context for {self.zone_name}:\n"
        for msg in recent_messages:
            role_display = "User" if msg['role'] == 'user' else "Assistant"
            context += f"{role_display}: {msg['content']}\n"
        
        return context.strip()
    
    def get_full_history(self):
        """Get the full conversation history."""
        return self.messages.copy()
    
    def clear_history(self):
        """Clear the conversation history."""
        self.messages.clear()
        self.created_at = datetime.now()
        self.last_activity = datetime.now()

# Global conversation storage (in production, use Redis or database)
conversation_threads = {}

def get_or_create_thread(zone_name):
    """Get existing conversation thread or create a new one."""
    if zone_name not in conversation_threads:
        conversation_threads[zone_name] = ConversationThread(zone_name)
    return conversation_threads[zone_name]

def cleanup_old_threads(max_age_hours=24):
    """Clean up old conversation threads to prevent memory issues."""
    current_time = datetime.now()
    zones_to_remove = []
    
    for zone_name, thread in conversation_threads.items():
        age = current_time - thread.last_activity
        if age.total_seconds() > max_age_hours * 3600:
            zones_to_remove.append(zone_name)
    
    for zone_name in zones_to_remove:
        del conversation_threads[zone_name]

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


@app.route('/chat', methods=['POST'])
def agricultural_chat():
    """
    AI chatbot endpoint for agricultural zone assistance.
    Handles queries about soil conditions, crop recommendations, weather, and sensors.
    Maintains conversation threads for context-aware responses.
    """
    try:
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({'error': 'Invalid or missing JSON body'}), 400
        
        # Extract zone data and user message
        zone_name = data.get('zone_name', 'Unknown Zone')
        soil_conditions = data.get('soil_conditions', {})
        crop_recommendations = data.get('crop_recommendations', [])
        weather_forecast = data.get('weather_forecast', {})
        sensor_health = data.get('sensor_health', {})
        user_message = data.get('user_message', '')
        
        if not user_message:
            return jsonify({'error': 'User message is required'}), 400
        
        # Get or create conversation thread for this zone
        thread = get_or_create_thread(zone_name)
        
        # Add user message to conversation thread
        thread.add_message('user', user_message)
        
        # Get conversation context for better responses
        conversation_context = thread.get_context_summary(max_context=3)
        
        # Generate response based on user query with conversation context
        response = generate_agricultural_response_with_context(
            zone_name, soil_conditions, crop_recommendations, 
            weather_forecast, sensor_health, user_message, conversation_context
        )
        
        # Add assistant response to conversation thread
        thread.add_message('assistant', response)
        
        # Clean up old threads periodically
        cleanup_old_threads()
        
        return jsonify({
            'zone_name': zone_name,
            'user_message': user_message,
            'assistant_response': response,
            'conversation_id': id(thread),
            'message_count': len(thread.messages),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as exc:
        return jsonify({'error': f'Chat processing failed: {str(exc)}'}), 500


@app.route('/chat/history/<zone_name>', methods=['GET'])
def get_chat_history(zone_name):
    """Get conversation history for a specific zone."""
    try:
        if zone_name in conversation_threads:
            thread = conversation_threads[zone_name]
            return jsonify({
                'zone_name': zone_name,
                'conversation_id': id(thread),
                'created_at': thread.created_at.isoformat(),
                'last_activity': thread.last_activity.isoformat(),
                'message_count': len(thread.messages),
                'messages': thread.get_full_history()
            })
        else:
            return jsonify({'error': f'No conversation thread found for zone: {zone_name}'}), 404
    except Exception as exc:
        return jsonify({'error': f'Failed to retrieve chat history: {str(exc)}'}), 500


@app.route('/chat/clear/<zone_name>', methods=['POST'])
def clear_chat_history(zone_name):
    """Clear conversation history for a specific zone."""
    try:
        if zone_name in conversation_threads:
            thread = conversation_threads[zone_name]
            thread.clear_history()
            return jsonify({
                'message': f'Chat history cleared for zone: {zone_name}',
                'zone_name': zone_name,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'error': f'No conversation thread found for zone: {zone_name}'}), 404
    except Exception as exc:
        return jsonify({'error': f'Failed to clear chat history: {str(exc)}'}), 500


@app.route('/chat/threads', methods=['GET'])
def list_conversation_threads():
    """List all active conversation threads."""
    try:
        threads_info = []
        for zone_name, thread in conversation_threads.items():
            threads_info.append({
                'zone_name': zone_name,
                'conversation_id': id(thread),
                'created_at': thread.created_at.isoformat(),
                'last_activity': thread.last_activity.isoformat(),
                'message_count': len(thread.messages),
                'is_active': (datetime.now() - thread.last_activity).total_seconds() < 3600  # Active if last message < 1 hour ago
            })
        
        # Sort by last activity (most recent first)
        threads_info.sort(key=lambda x: x['last_activity'], reverse=True)
        
        return jsonify({
            'active_threads': len(threads_info),
            'threads': threads_info,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as exc:
        return jsonify({'error': f'Failed to list conversation threads: {str(exc)}'}), 500


@app.route('/chat/context/<zone_name>', methods=['GET'])
def get_conversation_context(zone_name):
    """Get current conversation context summary for a specific zone."""
    try:
        if zone_name in conversation_threads:
            thread = conversation_threads[zone_name]
            return jsonify({
                'zone_name': zone_name,
                'conversation_id': id(thread),
                'context_summary': thread.get_context_summary(max_context=5),
                'recent_topics': _extract_recent_topics(thread.messages),
                'message_count': len(thread.messages),
                'last_activity': thread.last_activity.isoformat()
            })
        else:
            return jsonify({'error': f'No conversation thread found for zone: {zone_name}'}), 404
    except Exception as exc:
        return jsonify({'error': f'Failed to retrieve conversation context: {str(exc)}'}), 500


def _extract_recent_topics(messages, max_topics=3):
    """Extract recent conversation topics from message history."""
    if not messages:
        return []
    
    # Look at last few messages to identify topics
    recent_messages = messages[-5:] if len(messages) > 5 else messages
    
    topics = set()
    topic_keywords = {
        'soil': ['soil', 'ph', 'moisture', 'nutrient', 'fertilizer'],
        'crops': ['crop', 'plant', 'harvest', 'suitability', 'recommendation'],
        'weather': ['weather', 'temperature', 'rainfall', 'humidity', 'forecast'],
        'sensors': ['sensor', 'health', 'data', 'monitor', 'status'],
        'water': ['water', 'irrigation', 'moisture', 'drainage'],
        'pests': ['pest', 'disease', 'insect', 'control', 'management']
    }
    
    for msg in recent_messages:
        msg_lower = msg['content'].lower()
        for topic, keywords in topic_keywords.items():
            if any(keyword in msg_lower for keyword in keywords):
                topics.add(topic)
    
    return list(topics)[:max_topics]


def generate_agricultural_response(zone_name, soil_conditions, crop_recommendations, 
                                weather_forecast, sensor_health, user_message):
    """
    Generate contextual agricultural assistance response based on user query and zone data.
    Enhanced with comprehensive prompt handling and context-aware responses.
    """
    user_message_lower = user_message.lower()
    
    # Enhanced crop recommendation queries with farming terminology - PRIORITY 1
    crop_keywords = ['crop', 'recommend', 'suitability', 'plant', 'grow', 'harvest', 'cultivate', 'farm', 'agriculture', 'farming', 'yield', 'production', 'season', 'planting', 'seeding', 'transplant', 'germination', 'vegetation', 'foliage', 'roots', 'stems', 'leaves', 'flowers', 'fruits', 'vegetables', 'grains', 'legumes', 'cereals', 'horticulture', 'gardening', 'orchard', 'vineyard', 'field', 'plot', 'acre', 'hectare']
    if any(word in user_message_lower for word in crop_keywords):
        return _handle_crop_queries(crop_recommendations, user_message_lower)
    
    # Enhanced soil conditions queries with comprehensive keyword matching - PRIORITY 2
    soil_keywords = ['soil', 'ph', 'moisture', 'nutrient', 'nitrogen', 'phosphorus', 'potassium', 'fertility', 'composition', 'texture', 'organic matter', 'drainage', 'erosion', 'compaction', 'aeration', 'microbes', 'bacteria', 'fungus', 'earthworms', 'worms', 'earth', 'ground', 'dirt', 'substrate', 'medium', 'growing medium']
    if any(word in user_message_lower for word in soil_keywords):
        return _handle_soil_queries(soil_conditions, user_message_lower)
    
    # Enhanced weather queries with meteorological terms - PRIORITY 3
    weather_keywords = ['weather', 'rainfall', 'temperature', 'humidity', 'forecast', 'climate', 'atmosphere', 'precipitation', 'drought', 'flood', 'storm', 'wind', 'breeze', 'sunshine', 'solar', 'radiation', 'evaporation', 'transpiration', 'dew', 'frost', 'freeze', 'heat', 'cold', 'warm', 'cool', 'seasonal', 'daily', 'hourly', 'meteorological', 'atmospheric', 'environmental', 'ambient', 'air', 'sky', 'clouds', 'overcast', 'clear', 'partly cloudy']
    if any(word in user_message_lower for word in weather_keywords):
        return _handle_weather_queries(weather_forecast, user_message_lower)
    
    # Enhanced sensor queries with monitoring terminology - PRIORITY 4
    sensor_keywords = ['sensor', 'health', 'reading', 'data', 'monitor', 'status', 'device', 'equipment', 'instrument', 'probe', 'detector', 'transmitter', 'receiver', 'wireless', 'wired', 'connection', 'connectivity', 'network', 'system', 'platform', 'dashboard', 'interface', 'calibration', 'accuracy', 'precision', 'resolution', 'range', 'threshold', 'alert', 'alarm', 'notification', 'maintenance', 'troubleshooting', 'diagnostic', 'analytics', 'insights', 'trends', 'patterns', 'anomaly', 'outlier']
    if any(word in user_message_lower for word in sensor_keywords):
        return _handle_sensor_queries(sensor_health, user_message_lower)
    
    # Enhanced irrigation and water management queries - PRIORITY 5
    water_keywords = ['water', 'irrigation', 'drip', 'sprinkler', 'flood', 'furrow', 'subsurface', 'overhead', 'center pivot', 'linear', 'manual', 'automatic', 'schedule', 'timing', 'duration', 'frequency', 'amount', 'volume', 'flow', 'rate', 'pressure', 'head', 'efficiency', 'uniformity', 'distribution', 'coverage', 'runoff', 'drainage', 'infiltration', 'percolation', 'retention', 'storage', 'reservoir', 'tank', 'pond', 'well', 'borehole', 'groundwater', 'surface water', 'rainwater', 'harvesting', 'collection', 'treatment', 'filtration', 'purification', 'quality', 'testing', 'analysis']
    if any(word in user_message_lower for word in water_keywords):
        return _handle_water_queries(soil_conditions, weather_forecast, user_message_lower)
    
    # Enhanced pest and disease management queries - PRIORITY 6
    pest_keywords = ['pest', 'disease', 'insect', 'bug', 'worm', 'mite', 'aphid', 'thrips', 'whitefly', 'spider', 'beetle', 'caterpillar', 'larva', 'egg', 'nymph', 'adult', 'fungus', 'bacteria', 'virus', 'pathogen', 'infection', 'infestation', 'outbreak', 'epidemic', 'control', 'management', 'prevention', 'treatment', 'cure', 'remedy', 'solution', 'pesticide', 'insecticide', 'fungicide', 'herbicide', 'organic', 'natural', 'biological', 'chemical', 'integrated', 'IPM', 'monitoring', 'scouting', 'threshold', 'action', 'intervention', 'resistance', 'tolerance', 'susceptibility', 'vulnerability']
    if any(word in user_message_lower for word in pest_keywords):
        return _handle_pest_queries(soil_conditions, weather_forecast, user_message_lower)
    
    # Enhanced fertilization and nutrient management queries - PRIORITY 7
    fertilizer_keywords = ['fertilizer', 'nutrient', 'nitrogen', 'phosphorus', 'potassium', 'NPK', 'micronutrient', 'trace element', 'zinc', 'iron', 'manganese', 'copper', 'boron', 'molybdenum', 'chlorine', 'sulfur', 'calcium', 'magnesium', 'organic', 'inorganic', 'synthetic', 'natural', 'compost', 'manure', 'bone meal', 'blood meal', 'fish emulsion', 'seaweed', 'kelp', 'application', 'rate', 'timing', 'method', 'broadcast', 'band', 'side dress', 'foliar', 'soil', 'root', 'uptake', 'absorption', 'assimilation', 'utilization', 'efficiency', 'loss', 'leaching', 'volatilization', 'denitrification', 'fixation', 'mineralization', 'immobilization']
    if any(word in user_message_lower for word in fertilizer_keywords):
        return _handle_fertilizer_queries(soil_conditions, user_message_lower)
    
    # Enhanced machinery and equipment queries - PRIORITY 8
    machinery_keywords = ['machinery', 'equipment', 'tractor', 'implement', 'plow', 'harrow', 'cultivator', 'planter', 'seeder', 'sprayer', 'spreader', 'harvester', 'combine', 'thresher', 'mower', 'baler', 'loader', 'forklift', 'trailer', 'wagon', 'cart', 'wheelbarrow', 'shovel', 'rake', 'hoe', 'pruner', 'shears', 'knife', 'tool', 'attachment', 'hydraulic', 'pneumatic', 'mechanical', 'electrical', 'electronic', 'digital', 'smart', 'precision', 'GPS', 'autonomous', 'robotic', 'automated', 'manual', 'operation', 'maintenance', 'repair', 'service', 'fuel', 'energy', 'power', 'horsepower', 'torque', 'speed', 'gear', 'transmission', 'engine', 'motor']
    if any(word in user_message_lower for word in machinery_keywords):
        return _handle_machinery_queries(user_message_lower)
    
    # Enhanced market and economics queries - PRIORITY 9
    market_keywords = ['market', 'price', 'cost', 'profit', 'revenue', 'income', 'expense', 'budget', 'financial', 'economic', 'commercial', 'business', 'trade', 'export', 'import', 'supply', 'demand', 'consumption', 'production', 'yield', 'quality', 'grade', 'standard', 'certification', 'organic', 'conventional', 'premium', 'discount', 'contract', 'agreement', 'partnership', 'collaboration', 'cooperation', 'competition', 'rival', 'competitor', 'customer', 'consumer', 'buyer', 'seller', 'vendor', 'supplier', 'distributor', 'retailer', 'wholesaler', 'broker', 'agent', 'middleman', 'intermediary']
    if any(word in user_message_lower for word in market_keywords):
        return _handle_market_queries(crop_recommendations, user_message_lower)
    
    # Enhanced sustainability and environmental queries - PRIORITY 10
    sustainability_keywords = ['sustainability', 'environmental', 'ecological', 'green', 'organic', 'natural', 'biodiversity', 'conservation', 'preservation', 'protection', 'restoration', 'rehabilitation', 'regeneration', 'renewable', 'recyclable', 'biodegradable', 'compostable', 'waste', 'reduction', 'minimization', 'elimination', 'pollution', 'contamination', 'degradation', 'erosion', 'deforestation', 'desertification', 'climate change', 'global warming', 'carbon', 'footprint', 'emission', 'sequestration', 'offset', 'neutral', 'positive', 'negative', 'impact', 'effect', 'consequence', 'outcome', 'result']
    if any(word in user_message_lower for word in sustainability_keywords):
        return _handle_sustainability_queries(soil_conditions, crop_recommendations, user_message_lower)
    
    # Enhanced time and seasonal queries - PRIORITY 11
    time_keywords = ['time', 'timing', 'schedule', 'calendar', 'season', 'seasonal', 'annual', 'monthly', 'weekly', 'daily', 'hourly', 'moment', 'period', 'duration', 'frequency', 'interval', 'cycle', 'rotation', 'succession', 'sequence', 'order', 'priority', 'urgency', 'deadline', 'milestone', 'phase', 'stage', 'step', 'process', 'procedure', 'method', 'approach', 'strategy', 'plan', 'scheme', 'program', 'project', 'initiative', 'campaign', 'operation', 'activity', 'task', 'job', 'work', 'labor']
    if any(word in user_message_lower for word in time_keywords):
        return _handle_time_queries(weather_forecast, crop_recommendations, user_message_lower)
    
    # Enhanced measurement and data queries - PRIORITY 12
    measurement_keywords = ['measure', 'measurement', 'data', 'value', 'number', 'quantity', 'amount', 'size', 'dimension', 'length', 'width', 'height', 'depth', 'area', 'volume', 'weight', 'mass', 'density', 'concentration', 'ratio', 'percentage', 'proportion', 'fraction', 'decimal', 'integer', 'whole', 'fractional', 'precise', 'accurate', 'exact', 'approximate', 'estimate', 'guess', 'calculation', 'computation', 'mathematical', 'statistical', 'analytical', 'numerical', 'quantitative', 'qualitative', 'categorical', 'nominal', 'ordinal', 'interval', 'ratio']
    if any(word in user_message_lower for word in measurement_keywords):
        return _handle_measurement_queries(soil_conditions, weather_forecast, sensor_health, user_message_lower)
    
    # Enhanced general agricultural questions with farming operations - PRIORITY 13
    general_keywords = ['summary', 'overview', 'status', 'condition', 'report', 'analysis', 'assessment', 'evaluation', 'review', 'check', 'verify', 'confirm', 'investigate', 'examine', 'inspect', 'survey', 'audit', 'inventory', 'stock', 'supply', 'demand', 'market', 'economics', 'cost', 'profit', 'revenue', 'investment', 'planning', 'strategy', 'tactics', 'operations', 'management', 'administration', 'coordination', 'scheduling', 'timing', 'calendar', 'seasonal', 'annual', 'monthly', 'weekly', 'daily']
    if any(word in user_message_lower for word in general_keywords):
        return _generate_zone_summary(zone_name, soil_conditions, crop_recommendations, weather_forecast, sensor_health)
    
    # Enhanced help and assistance queries - PRIORITY 14
    help_keywords = ['help', 'assist', 'support', 'guide', 'explain', 'clarify', 'understand', 'learn', 'teach', 'instruct', 'educate', 'inform', 'advise', 'suggest', 'recommend', 'propose', 'offer', 'provide', 'give', 'share', 'show', 'demonstrate', 'illustrate', 'example', 'instance', 'case', 'scenario', 'situation', 'circumstance', 'context', 'background', 'history', 'experience', 'knowledge', 'expertise', 'skill', 'ability', 'capability', 'competence', 'proficiency', 'mastery']
    if any(word in user_message_lower for word in help_keywords):
        return _handle_help_queries(zone_name, user_message_lower)
    
    # Enhanced greeting detection with more precise matching - PRIORITY 15 (LAST)
    # Only match exact greeting phrases, not questions that happen to contain greeting words
    exact_greetings = ['hello', 'hi', 'hey', 'start', 'begin', 'good morning', 'good afternoon', 'good evening', 'greetings', 'welcome']
    if any(greeting == user_message_lower.strip() for greeting in exact_greetings) or user_message_lower.strip() in exact_greetings:
        return f"I'm here to help you with agricultural insights for {zone_name}. You can ask me about soil conditions, crop recommendations, weather patterns, or sensor data. How can I assist you today?"
    
    # Enhanced fallback with context-aware suggestions
    return _generate_contextual_fallback(zone_name, soil_conditions, crop_recommendations, weather_forecast, sensor_health, user_message_lower)


def _handle_soil_queries(soil_conditions, user_message):
    """Handle soil-related queries with simple explanations."""
    if not soil_conditions:
        return "I don't have current soil data available. Please check your sensor connections or contact your zone administrator."
    
    response_parts = []
    
    # pH explanation
    if 'ph' in user_message:
        ph = soil_conditions.get('ph')
        if ph is not None:
            if ph < 6.0:
                ph_status = "acidic (good for blueberries, potatoes)"
            elif ph < 6.5:
                ph_status = "slightly acidic (good for most crops)"
            elif ph < 7.5:
                ph_status = "neutral (optimal for most crops)"
            else:
                ph_status = "alkaline (good for asparagus, cabbage)"
            response_parts.append(f"Current soil pH is {ph:.1f} - {ph_status}")
    
    # Moisture explanation
    if 'moisture' in user_message:
        moisture = soil_conditions.get('moisture')
        if moisture is not None:
            if moisture < 30:
                moisture_status = "dry - consider irrigation"
            elif moisture < 60:
                moisture_status = "moderate - adequate for most crops"
            else:
                moisture_status = "wet - monitor for drainage issues"
            response_parts.append(f"Soil moisture is {moisture:.1f}% - {moisture_status}")
    
    # Nutrient explanation
    if any(word in user_message for word in ['nitrogen', 'phosphorus', 'potassium', 'nutrient']):
        n = soil_conditions.get('N')
        p = soil_conditions.get('P')
        k = soil_conditions.get('K')
        
        if all(v is not None for v in [n, p, k]):
            response_parts.append(f"Nutrient levels: Nitrogen (N): {n} ppm, Phosphorus (P): {p} ppm, Potassium (K): {k} ppm")
            
            # Simple nutrient interpretation
            if n < 50:
                response_parts.append("Nitrogen levels are low - consider adding nitrogen-rich fertilizer")
            if p < 30:
                response_parts.append("Phosphorus levels are low - bone meal or rock phosphate can help")
            if k < 100:
                response_parts.append("Potassium levels are low - wood ash or potassium sulfate can help")
    
    if not response_parts:
        response_parts.append("Available soil data: " + ", ".join([f"{k}: {v}" for k, v in soil_conditions.items()]))
    
    return " ".join(response_parts)


def _handle_crop_queries(crop_recommendations, user_message):
    """Handle crop recommendation queries with explanations."""
    if not crop_recommendations:
        return "I don't have crop recommendations available. Please run a crop analysis first or contact your zone administrator."
    
    if 'summary' in user_message or 'overview' in user_message:
        return _summarize_crop_recommendations(crop_recommendations)
    
    # Look for specific crop mentions
    for crop_rec in crop_recommendations:
        crop_name = crop_rec.get('crop', '').lower()
        if crop_name in user_message:
            score = crop_rec.get('score_percent', 0)
            rank = crop_rec.get('rank', 0)
            return f"{crop_rec['crop']} is ranked #{rank} with a suitability score of {score}%. This crop is well-suited for your current soil and climate conditions."
    
    # General crop advice
    if len(crop_recommendations) > 0:
        top_crop = crop_recommendations[0]
        return f"Based on current conditions, {top_crop['crop']} is your best option with a {top_crop['score_percent']}% suitability score. Would you like me to explain why this crop is recommended or provide details about other options?"
    
    return "I can help you understand crop recommendations. Ask me about specific crops or request a summary of all recommendations."


def _handle_weather_queries(weather_forecast, user_message):
    """Handle weather-related queries with simple explanations."""
    if not weather_forecast:
        return "I don't have current weather data available. Please check your weather station or contact your zone administrator."
    
    response_parts = []
    
    if 'temperature' in user_message:
        temp = weather_forecast.get('temperature')
        if temp is not None:
            if temp < 10:
                temp_status = "cold - protect sensitive crops"
            elif temp < 20:
                temp_status = "cool - good for cool-season crops"
            elif temp < 30:
                temp_status = "moderate - optimal for most crops"
            else:
                temp_status = "hot - provide shade and extra water"
            response_parts.append(f"Current temperature is {temp:.1f}°C - {temp_status}")
    
    if 'rainfall' in user_message or 'precipitation' in user_message:
        rainfall = weather_forecast.get('rainfall')
        if rainfall is not None:
            if rainfall < 5:
                rainfall_status = "light - monitor soil moisture"
            elif rainfall < 20:
                rainfall_status = "moderate - good for crop growth"
            else:
                rainfall_status = "heavy - watch for flooding and disease"
            response_parts.append(f"Expected rainfall: {rainfall:.1f} mm - {rainfall_status}")
    
    if 'humidity' in user_message:
        humidity = weather_forecast.get('humidity')
        if humidity is not None:
            if humidity < 40:
                humidity_status = "low - increase irrigation"
            elif humidity < 70:
                humidity_status = "moderate - good conditions"
            else:
                humidity_status = "high - watch for fungal diseases"
            response_parts.append(f"Humidity is {humidity:.1f}% - {humidity_status}")
    
    if not response_parts:
        response_parts.append("Available weather data: " + ", ".join([f"{k}: {v}" for k, v in weather_forecast.items()]))
    
    return " ".join(response_parts)


def _handle_sensor_queries(sensor_health, user_message):
    """Handle sensor health and data queries."""
    if not sensor_health:
        return "I don't have sensor health data available. Please check your monitoring system or contact your zone administrator."
    
    if 'health' in user_message or 'status' in user_message:
        healthy_sensors = sum(1 for sensor in sensor_health.values() if sensor.get('status') == 'healthy')
        total_sensors = len(sensor_health)
        
        if total_sensors > 0:
            health_percentage = (healthy_sensors / total_sensors) * 100
            return f"Sensor health overview: {healthy_sensors}/{total_sensors} sensors are healthy ({health_percentage:.1f}%)."
        else:
            return "No sensor data available for health assessment."
    
    # Look for specific sensor types
    for sensor_type, sensor_data in sensor_health.items():
        if sensor_type.lower() in user_message:
            status = sensor_data.get('status', 'unknown')
            last_reading = sensor_data.get('last_reading', 'N/A')
            return f"{sensor_type} sensor status: {status}. Last reading: {last_reading}"
    
    return "I can help you check sensor status. Ask me about overall sensor health or specific sensor types like soil, weather, or irrigation sensors."


def _generate_zone_summary(zone_name, soil_conditions, crop_recommendations, weather_forecast, sensor_health):
    """Generate a comprehensive zone summary."""
    summary_parts = [f"Here's a summary of {zone_name}:"]
    
    # Soil summary
    if soil_conditions:
        summary_parts.append("Soil conditions are available and within normal ranges.")
    
    # Crop summary
    if crop_recommendations:
        top_crop = crop_recommendations[0]
        summary_parts.append(f"Top crop recommendation: {top_crop['crop']} with {top_crop['score_percent']}% suitability.")
    
    # Weather summary
    if weather_forecast:
        temp = weather_forecast.get('temperature')
        rainfall = weather_forecast.get('rainfall')
        if temp is not None and rainfall is not None:
            summary_parts.append(f"Weather: {temp:.1f}°C with {rainfall:.1f}mm rainfall expected.")
    
    # Sensor summary
    if sensor_health:
        healthy_count = sum(1 for sensor in sensor_health.values() if sensor.get('status') == 'healthy')
        total_count = len(sensor_health)
        summary_parts.append(f"Sensors: {healthy_count}/{total_count} are operational.")
    
    return " ".join(summary_parts)


def _summarize_crop_recommendations(crop_recommendations):
    """Provide a summary of all crop recommendations."""
    if not crop_recommendations:
        return "No crop recommendations available."
    
    summary = "Crop suitability rankings:\n"
    for i, crop_rec in enumerate(crop_recommendations[:5], 1):  # Top 5
        crop_name = crop_rec.get('crop', 'Unknown')
        score = crop_rec.get('score_percent', 0)
        summary += f"{i}. {crop_name}: {score}%\n"
    
    if len(crop_recommendations) > 5:
        summary += f"... and {len(crop_recommendations) - 5} more crops analyzed."
    
    return summary


def _handle_water_queries(soil_conditions, weather_forecast, user_message):
    """Handle water and irrigation management queries."""
    response_parts = []
    
    # Soil moisture analysis
    if 'moisture' in user_message:
        moisture = soil_conditions.get('moisture')
        if moisture is not None:
            if moisture < 30:
                response_parts.append("Soil moisture is low ({}%) - immediate irrigation recommended. Consider drip irrigation for water efficiency.")
            elif moisture < 60:
                response_parts.append("Soil moisture is moderate ({}%) - adequate for most crops, but monitor closely.")
            else:
                response_parts.append("Soil moisture is high ({}%) - reduce irrigation to prevent waterlogging and root diseases.")
    
    # Rainfall analysis
    if 'rainfall' in user_message:
        rainfall = weather_forecast.get('rainfall')
        if rainfall is not None:
            if rainfall < 5:
                response_parts.append("Low rainfall expected ({}mm) - supplement with irrigation.")
            elif rainfall < 20:
                response_parts.append("Moderate rainfall expected ({}mm) - should be sufficient for most crops.")
            else:
                response_parts.append("Heavy rainfall expected ({}mm) - reduce irrigation, monitor drainage.")
    
    # Irrigation recommendations
    if 'irrigation' in user_message:
        response_parts.append("Irrigation recommendations: Use drip systems for row crops, sprinklers for field crops, and adjust timing based on soil moisture sensors.")
    
    if not response_parts:
        response_parts.append("I can help with water management. Ask me about soil moisture, rainfall, irrigation systems, or drainage.")
    
    return " ".join(response_parts)


def _handle_pest_queries(soil_conditions, weather_forecast, user_message):
    """Handle pest and disease management queries."""
    response_parts = []
    
    # Weather-based pest risk assessment
    if 'disease' in user_message or 'pest' in user_message:
        humidity = weather_forecast.get('humidity')
        temperature = weather_forecast.get('temperature')
        
        if humidity is not None and humidity > 70:
            response_parts.append("High humidity ({}%) increases fungal disease risk. Monitor crops for early symptoms and consider preventive fungicide applications.")
        
        if temperature is not None and temperature > 25:
            response_parts.append("Warm temperatures ({}°C) favor insect pest development. Implement regular scouting and consider integrated pest management strategies.")
    
    # Soil health for pest resistance
    if 'soil' in user_message and 'pest' in user_message:
        ph = soil_conditions.get('ph')
        if ph is not None:
            if ph < 6.0:
                response_parts.append("Acidic soil (pH {}) can increase susceptibility to certain diseases. Consider lime application to raise pH.")
            elif ph > 7.5:
                response_parts.append("Alkaline soil (pH {}) may reduce nutrient availability, making plants more vulnerable to pests.")
    
    if not response_parts:
        response_parts.append("Pest management strategies: Regular monitoring, crop rotation, resistant varieties, and integrated pest management (IPM) are key to sustainable pest control.")
    
    return " ".join(response_parts)


def _handle_fertilizer_queries(soil_conditions, user_message):
    """Handle fertilization and nutrient management queries."""
    response_parts = []
    
    # NPK analysis and recommendations
    if any(word in user_message for word in ['nitrogen', 'phosphorus', 'potassium', 'NPK']):
        n = soil_conditions.get('N')
        p = soil_conditions.get('P')
        k = soil_conditions.get('K')
        
        if all(v is not None for v in [n, p, k]):
            response_parts.append(f"Current NPK levels: N={n} ppm, P={p} ppm, K={k} ppm")
            
            # Nitrogen recommendations
            if n < 50:
                response_parts.append("Nitrogen is low - apply 50-100 kg/ha of nitrogen fertilizer. Consider split applications for better efficiency.")
            elif n > 200:
                response_parts.append("Nitrogen is high - reduce applications to prevent leaching and environmental pollution.")
            
            # Phosphorus recommendations
            if p < 30:
                response_parts.append("Phosphorus is low - apply 40-80 kg/ha P2O5. Bone meal or rock phosphate are good organic options.")
            elif p > 100:
                response_parts.append("Phosphorus is adequate - maintain current levels with maintenance applications.")
            
            # Potassium recommendations
            if k < 100:
                response_parts.append("Potassium is low - apply 60-120 kg/ha K2O. Wood ash or potassium sulfate are effective sources.")
            elif k > 300:
                response_parts.append("Potassium is high - reduce applications to avoid luxury consumption.")
    
    # Application timing
    if 'timing' in user_message or 'when' in user_message:
        response_parts.append("Fertilizer timing: Apply nitrogen in split doses during growing season, phosphorus at planting, and potassium based on crop removal rates.")
    
    if not response_parts:
        response_parts.append("Fertilizer management: Soil testing guides application rates, timing affects efficiency, and organic options improve soil health long-term.")
    
    return " ".join(response_parts)


def _handle_machinery_queries(user_message):
    """Handle machinery and equipment queries."""
    if 'tractor' in user_message:
        return "Tractor operations: Ensure proper ballasting for field work, maintain tire pressure for soil compaction control, and use appropriate implements for your soil type."
    
    if 'harvester' in user_message or 'harvest' in user_message:
        return "Harvesting equipment: Calibrate for optimal yield, adjust settings for crop conditions, and maintain sharp cutting edges for clean harvests."
    
    if 'irrigation' in user_message and 'equipment' in user_message:
        return "Irrigation equipment: Regular maintenance prevents breakdowns, proper pressure ensures uniform water distribution, and automation saves labor and water."
    
    return "Machinery management: Regular maintenance schedules, proper operation training, and appropriate equipment selection are key to efficient farm operations."


def _handle_market_queries(crop_recommendations, user_message):
    """Handle market and economics queries."""
    response_parts = []
    
    # Crop market analysis
    if crop_recommendations and any(word in user_message for word in ['market', 'price', 'profit']):
        top_crop = crop_recommendations[0]
        response_parts.append(f"Market analysis for {top_crop['crop']}: High suitability score ({top_crop['score_percent']}%) suggests good yield potential, which typically correlates with better profit margins.")
    
    # General market advice
    if 'market' in user_message:
        response_parts.append("Market strategies: Diversify crops to spread risk, monitor local and global price trends, build relationships with buyers, and consider value-added processing.")
    
    if 'cost' in user_message or 'budget' in user_message:
        response_parts.append("Cost management: Track all inputs, compare organic vs conventional costs, consider long-term soil health investments, and analyze cost-benefit ratios for new technologies.")
    
    if not response_parts:
        response_parts.append("Agricultural economics: Focus on sustainable practices that improve long-term profitability, monitor market trends, and build strong supply chain relationships.")
    
    return " ".join(response_parts)


def _handle_sustainability_queries(soil_conditions, crop_recommendations, user_message):
    """Handle sustainability and environmental queries."""
    response_parts = []
    
    # Soil health sustainability
    if 'soil' in user_message and any(word in user_message for word in ['sustainability', 'organic', 'health']):
        ph = soil_conditions.get('ph')
        if ph is not None and 6.0 <= ph <= 7.5:
            response_parts.append("Your soil pH ({}) is in the optimal range for sustainable agriculture. This supports diverse soil life and efficient nutrient cycling.")
        elif ph is not None:
            response_parts.append("Soil pH ({}) could be improved for sustainability. Consider organic amendments like compost to gradually adjust pH and improve soil structure.")
    
    # Crop diversity for sustainability
    if crop_recommendations and 'sustainability' in user_message:
        crop_count = len(crop_recommendations)
        if crop_count >= 5:
            response_parts.append(f"Good crop diversity ({crop_count} options) supports sustainable farming by reducing pest pressure and improving soil health through crop rotation.")
        else:
            response_parts.append("Consider expanding crop diversity for better sustainability. Multiple crops in rotation improve soil health and reduce disease risk.")
    
    # General sustainability practices
    if 'sustainability' in user_message:
        response_parts.append("Sustainable practices: Crop rotation, cover crops, reduced tillage, integrated pest management, and organic amendments build long-term soil health and farm resilience.")
    
    if not response_parts:
        response_parts.append("Environmental stewardship: Sustainable agriculture protects natural resources, improves soil health, and ensures long-term productivity while supporting biodiversity.")
    
    return " ".join(response_parts)


def _handle_time_queries(weather_forecast, crop_recommendations, user_message):
    """Handle time and seasonal queries."""
    response_parts = []
    
    # Seasonal timing
    if 'season' in user_message or 'timing' in user_message:
        temperature = weather_forecast.get('temperature')
        if temperature is not None:
            if temperature < 15:
                response_parts.append("Cool season conditions ({}°C) - ideal for cool-season crops like lettuce, spinach, and peas.")
            elif temperature < 25:
                response_parts.append("Moderate season conditions ({}°C) - optimal for most crops including tomatoes, peppers, and beans.")
            else:
                response_parts.append("Warm season conditions ({}°C) - perfect for heat-loving crops like corn, melons, and okra.")
    
    # Crop timing recommendations
    if crop_recommendations and any(word in user_message for word in ['plant', 'sow', 'transplant']):
        top_crop = crop_recommendations[0]
        response_parts.append(f"For {top_crop['crop']} (suitability: {top_crop['score_percent']}%), plant when soil temperature is optimal and frost risk is minimal.")
    
    # General timing advice
    if 'schedule' in user_message or 'planning' in user_message:
        response_parts.append("Farming schedule: Plan crop rotations, prepare soil early, stagger plantings for continuous harvest, and align activities with weather patterns.")
    
    if not response_parts:
        response_parts.append("Timing is crucial in agriculture: Align planting with optimal conditions, consider crop maturity periods, and plan for seasonal weather patterns.")
    
    return " ".join(response_parts)


def _handle_measurement_queries(soil_conditions, weather_forecast, sensor_health, user_message):
    """Handle measurement and data queries."""
    response_parts = []
    
    # Data availability summary
    available_data = []
    if soil_conditions:
        available_data.append(f"soil ({len(soil_conditions)} parameters)")
    if weather_forecast:
        available_data.append(f"weather ({len(weather_forecast)} parameters)")
    if sensor_health:
        available_data.append(f"sensors ({len(sensor_health)} devices)")
    
    if available_data:
        response_parts.append(f"Available data sources: {', '.join(available_data)}")
    
    # Measurement accuracy
    if 'accuracy' in user_message or 'precision' in user_message:
        response_parts.append("Data accuracy: Soil sensors typically ±5%, weather stations ±2°C, and pH meters ±0.1 pH units. Regular calibration ensures reliable measurements.")
    
    # Data interpretation
    if 'interpret' in user_message or 'meaning' in user_message:
        response_parts.append("Data interpretation: Compare current readings to historical averages, consider seasonal trends, and use multiple data points for informed decisions.")
    
    if not response_parts:
        response_parts.append("Measurement systems: Regular monitoring provides trends, early warning of problems, and data-driven decision making for optimal crop management.")
    
    return " ".join(response_parts)


def _handle_help_queries(zone_name, user_message):
    """Handle help and assistance queries."""
    if 'help' in user_message:
        return f"I'm your agricultural assistant for {zone_name}. I can help with:\n• Soil analysis and recommendations\n• Crop suitability and planning\n• Weather monitoring and forecasts\n• Sensor health and data\n• Water and irrigation management\n• Pest and disease control\n• Fertilization strategies\n• Machinery and equipment\n• Market and economics\n• Sustainability practices\n\nJust ask me about any of these topics!"
    
    if 'explain' in user_message or 'what' in user_message:
        return "I can explain agricultural concepts, interpret your zone data, and provide actionable recommendations. What would you like me to clarify?"
    
    if 'learn' in user_message or 'teach' in user_message:
        return "I'm here to help you learn about agricultural best practices. I can explain soil science, crop management, and sustainable farming techniques based on your zone data."
    
    return "I'm here to help! Ask me about soil conditions, crops, weather, sensors, or any other agricultural topic related to your zone."


def _generate_contextual_fallback(zone_name, soil_conditions, crop_recommendations, weather_forecast, sensor_health, user_message):
    """Generate context-aware fallback responses with helpful suggestions."""
    # Analyze what data is available to provide relevant suggestions
    available_topics = []
    
    if soil_conditions:
        available_topics.append("soil conditions")
    if crop_recommendations:
        available_topics.append("crop recommendations")
    if weather_forecast:
        available_topics.append("weather data")
    if sensor_health:
        available_topics.append("sensor readings")
    
    if available_topics:
        topics_text = ", ".join(available_topics)
        return f"I can only help with agricultural information related to {zone_name}. I have data about {topics_text}. Please ask me about these topics or request a zone summary. For other questions, contact your system administrator."
    else:
        return f"I can only help with agricultural information related to {zone_name}. Currently, I don't have access to zone data. Please check your sensor connections or contact your zone administrator to set up data collection."


def generate_agricultural_response_with_context(zone_name, soil_conditions, crop_recommendations, 
                                             weather_forecast, sensor_health, user_message, conversation_context=""):
    """
    Generate contextual agricultural assistance response with conversation history context.
    """
    # First, check if this is a follow-up question that references previous context
    user_message_lower = user_message.lower()
    
    # Check for follow-up indicators
    follow_up_indicators = ['it', 'that', 'this', 'they', 'them', 'those', 'these', 'previous', 'earlier', 'before', 'last time', 'mentioned', 'said', 'talked about', 'what about', 'how about', 'and', 'also', 'too', 'as well', 'in addition', 'furthermore', 'moreover', 'besides', 'additionally']
    is_follow_up = any(indicator in user_message_lower for indicator in follow_up_indicators)
    
    # Check for clarification requests
    clarification_indicators = ['what do you mean', 'can you explain', 'clarify', 'elaborate', 'expand on', 'tell me more about', 'go into detail', 'break down', 'simplify', 'in simple terms']
    is_clarification = any(indicator in user_message_lower for indicator in clarification_indicators)
    
    # If it's a follow-up and we have conversation context, enhance the response
    if is_follow_up and conversation_context:
        # Generate base response
        base_response = generate_agricultural_response(
            zone_name, soil_conditions, crop_recommendations, 
            weather_forecast, sensor_health, user_message
        )
        
        # Enhance with context awareness
        if base_response.startswith("I'm here to help"):
            # Don't modify greeting responses
            return base_response
        else:
            enhanced_response = f"Based on our previous conversation, {base_response.lower()}"
            return enhanced_response
    
    # If it's a clarification request, provide more detailed explanation
    elif is_clarification and conversation_context:
        base_response = generate_agricultural_response(
            zone_name, soil_conditions, crop_recommendations, 
            weather_forecast, sensor_health, user_message
        )
        
        if not base_response.startswith("I'm here to help"):
            enhanced_response = f"Let me clarify that for you: {base_response}"
            return enhanced_response
    
    # Otherwise, generate normal response
    return generate_agricultural_response(
        zone_name, soil_conditions, crop_recommendations, 
        weather_forecast, sensor_health, user_message
    )


if __name__ == '__main__':
    app.run(debug=True)