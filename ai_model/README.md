Crop Recommendation API

Overview

- Flask API that predicts the best crop from environmental and soil features and generates an investor-style report via Google Gemini.

Requirements

- Python 3.9+
- Install dependencies:
  - pip install -r requirements.txt

Environment Setup

1. Create a .env file at the project root with your Google Gemini API key:
   GEMINI_API_KEY=your_api_key_here

2. Start the Flask server (Windows PowerShell example):
   set FLASK_APP=app/app.py
   set FLASK_ENV=development
   python -m flask run --host=0.0.0.0 --port=5000

Or directly run:
python app/app.py

API

## POST /predict

**Crop Recommendation with AI Report**

Request JSON body:

```json
{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 20.88,
  "humidity": 82,
  "ph": 6.5,
  "rainfall": 202.94
}
```

Response JSON:

```json
{
  "recommended_crop": "rice",
  "predictions": {
    "rice": 0.72,
    "wheat": 0.18,
    "maize": 0.06,
    "barley": 0.03,
    "cotton": 0.01
  },
  "report": "Full detailed investor report..."
}
```

## POST /chat

**Agricultural Zone Assistant Chatbot**

Request JSON body:

```json
{
  "zone_name": "Central Zone",
  "soil_conditions": {
    "ph": 6.5,
    "moisture": 45.2,
    "N": 90,
    "P": 42,
    "K": 43
  },
  "crop_recommendations": [
    { "crop": "coffee", "score_percent": 87.3, "rank": 1 },
    { "crop": "mango", "score_percent": 65.1, "rank": 2 },
    { "crop": "rice", "score_percent": 48.0, "rank": 3 }
  ],
  "weather_forecast": {
    "temperature": 20.88,
    "humidity": 82,
    "rainfall": 202.94
  },
  "sensor_health": {
    "soil_sensor": {
      "status": "healthy",
      "last_reading": "2024-01-15T10:30:00Z"
    },
    "weather_station": {
      "status": "healthy",
      "last_reading": "2024-01-15T10:25:00Z"
    }
  },
  "user_message": "What is the soil pH today?"
}
```

Response JSON:

```json
{
  "zone_name": "Central Zone",
  "user_message": "What is the soil pH today?",
  "assistant_response": "Current soil pH is 6.5 - slightly acidic (good for most crops)",
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

Notes

- The model and scaler are loaded from model/crop_rec_model.pkl and model/scaler.pkl.
- The endpoint performs input validation, scaling, predict and predict_proba, then calls Gemini to build a professional investor/exporter report.
- If the Gemini call fails, a fallback message is returned in the report field.

## Conversation Thread System

The chatbot now maintains conversation threads for each zone, allowing for context-aware responses and follow-up conversations.

### Conversation Thread Features

- **Automatic Thread Management**: Each zone gets its own conversation thread
- **Context Awareness**: Responses consider previous conversation history
- **Follow-up Detection**: Automatically detects follow-up questions
- **Memory Management**: Automatically cleans up old threads (24+ hours inactive)
- **Topic Extraction**: Identifies conversation topics for better context

### New Chat Endpoints

#### 1. Enhanced `/chat` Endpoint

The main chat endpoint now includes conversation threading:

**Request**: Same as before, but now maintains conversation context

**Response**:

```json
{
  "zone_name": "Central Zone",
  "user_message": "What is the soil pH today?",
  "assistant_response": "Current soil pH is 6.5 - slightly acidic (good for most crops)",
  "conversation_id": 140234567890,
  "message_count": 3,
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

#### 2. `/chat/history/<zone_name>` - Get Conversation History

Retrieve the full conversation history for a specific zone.

**Method**: `GET`

**URL**: `/chat/history/Central%20Zone`

**Response**:

```json
{
  "zone_name": "Central Zone",
  "conversation_id": 140234567890,
  "created_at": "2024-01-15T09:00:00.000000",
  "last_activity": "2024-01-15T10:30:00.123456",
  "message_count": 6,
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2024-01-15T09:00:00.000000"
    },
    {
      "role": "assistant",
      "content": "I'm here to help you with agricultural insights for Central Zone...",
      "timestamp": "2024-01-15T09:00:00.100000"
    }
  ]
}
```

#### 3. `/chat/context/<zone_name>` - Get Conversation Context

Get a summary of recent conversation context and topics.

**Method**: `GET`

**URL**: `/chat/context/Central%20Zone`

**Response**:

```json
{
  "zone_name": "Central Zone",
  "conversation_id": 140234567890,
  "context_summary": "Recent conversation context for Central Zone:\nUser: What is the soil pH today?\nAssistant: Current soil pH is 6.5...",
  "recent_topics": ["soil", "crops"],
  "message_count": 6,
  "last_activity": "2024-01-15T10:30:00.123456"
}
```

#### 4. `/chat/clear/<zone_name>` - Clear Conversation History

Clear the conversation history for a specific zone.

**Method**: `POST`

**URL**: `/chat/clear/Central%20Zone`

**Response**:

```json
{
  "message": "Chat history cleared for zone: Central Zone",
  "zone_name": "Central Zone",
  "timestamp": "2024-01-15T10:35:00.000000"
}
```

#### 5. `/chat/threads` - List All Active Threads

Get information about all active conversation threads.

**Method**: `GET`

**URL**: `/chat/threads`

**Response**:

```json
{
  "active_threads": 2,
  "threads": [
    {
      "zone_name": "Central Zone",
      "conversation_id": 140234567890,
      "created_at": "2024-01-15T09:00:00.000000",
      "last_activity": "2024-01-15T10:30:00.123456",
      "message_count": 6,
      "is_active": true
    },
    {
      "zone_name": "North Zone",
      "conversation_id": 140234567891,
      "created_at": "2024-01-15T08:00:00.000000",
      "last_activity": "2024-01-15T09:15:00.000000",
      "message_count": 4,
      "is_active": false
    }
  ],
  "timestamp": "2024-01-15T10:35:00.000000"
}
```

### Conversation Context Examples

#### Follow-up Questions

The system automatically detects follow-up questions and provides context-aware responses:

**User**: "What is the soil pH today?"
**Assistant**: "Current soil pH is 6.5 - slightly acidic (good for most crops)"

**User**: "What about the moisture?"
**Assistant**: "Based on our previous conversation, current soil moisture is 45.2% - moderate levels, adequate for most crops but monitor closely."

#### Clarification Requests

**User**: "Can you explain that in simple terms?"
**Assistant**: "Let me clarify that for you: Your soil has good acidity levels that most plants prefer, and there's enough water in the soil to keep plants healthy without drowning them."

### Testing Conversation Threads

#### Test Conversation Flow:

```powershell
# 1. Start a conversation
$chatBody = '{
  "zone_name": "Central Zone",
  "soil_conditions": {"ph": 6.5, "moisture": 45.2, "N": 90, "P": 42, "K": 43},
  "crop_recommendations": [{"crop": "coffee", "score_percent": 87.3, "rank": 1}],
  "weather_forecast": {"temperature": 20.88, "humidity": 82, "rainfall": 202.94},
  "sensor_health": {"soil_sensor": {"status": "healthy", "last_reading": "2024-01-15T10:30:00Z"}},
  "user_message": "What is the soil pH today?"
}'
Invoke-RestMethod -Uri http://localhost:5000/chat -Method Post -Body $chatBody -ContentType 'application/json'

# 2. Follow-up question
$followUpBody = '{
  "zone_name": "Central Zone",
  "soil_conditions": {"ph": 6.5, "moisture": 45.2, "N": 90, "P": 42, "K": 43},
  "crop_recommendations": [{"crop": "coffee", "score_percent": 87.3, "rank": 1}],
  "weather_forecast": {"temperature": 20.88, "humidity": 82, "rainfall": 202.94},
  "sensor_health": {"soil_sensor": {"status": "healthy", "last_reading": "2024-01-15T10:30:00Z"}},
  "user_message": "What about the moisture levels?"
}'
Invoke-RestMethod -Uri http://localhost:5000/chat -Method Post -Body $followUpBody -ContentType 'application/json'

# 3. Check conversation history
Invoke-RestMethod -Uri "http://localhost:5000/chat/history/Central%20Zone" -Method Get

# 4. Get conversation context
Invoke-RestMethod -Uri "http://localhost:5000/chat/context/Central%20Zone" -Method Get

# 5. List all threads
Invoke-RestMethod -Uri "http://localhost:5000/chat/threads" -Method Get
```

### Technical Details

- **Memory Management**: Threads are automatically cleaned up after 24 hours of inactivity
- **Message Limit**: Each thread stores up to 50 messages to prevent memory issues
- **Context Window**: Recent 3-5 messages are used for context awareness
- **Topic Detection**: Automatic identification of conversation topics (soil, crops, weather, etc.)
- **Follow-up Detection**: Uses linguistic indicators to identify follow-up questions
- **Thread Isolation**: Each zone maintains completely separate conversation threads

Testing from PowerShell

### Test /predict endpoint:

```powershell
$body = '{
  "N": 90,
  "P": 42,
  "K": 43,
  "temperature": 20.88,
  "humidity": 82,
  "ph": 6.5,
  "rainfall": 202.94
}'
Invoke-RestMethod -Uri http://localhost:5000/predict -Method Post -Body $body -ContentType 'application/json'
```

### Test /chat endpoint:

```powershell
$chatBody = '{
  "zone_name": "Central Zone",
  "soil_conditions": {
    "ph": 6.5,
    "moisture": 45.2,
    "N": 90,
    "P": 42,
    "K": 43
  },
  "crop_recommendations": [
    {"crop": "coffee", "score_percent": 87.3, "rank": 1},
    {"crop": "mango", "score_percent": 65.1, "rank": 2}
  ],
  "weather_forecast": {
    "temperature": 20.88,
    "humidity": 82,
    "rainfall": 202.94
  },
  "sensor_health": {
    "soil_sensor": {"status": "healthy", "last_reading": "2024-01-15T10:30:00Z"}
  },
  "user_message": "What is the soil pH today?"
}'
Invoke-RestMethod -Uri http://localhost:5000/chat -Method Post -Body $chatBody -ContentType 'application/json'
```

Limitations

- MVP does not include persistence (DB) or price/yield data.
- Free-tier Gemini may have rate limits and latency variability.
