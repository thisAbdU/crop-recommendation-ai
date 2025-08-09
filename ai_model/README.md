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
POST /predict
Request JSON body:
{
"N": 90,
"P": 42,
"K": 43,
"temperature": 20.88,
"humidity": 82,
"ph": 6.5,
"rainfall": 202.94
}

Response JSON:
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

Notes

- The model and scaler are loaded from model/crop_rec_model.pkl and model/scaler.pkl.
- The endpoint performs input validation, scaling, predict and predict_proba, then calls Gemini to build a professional investor/exporter report.
- If the Gemini call fails, a fallback message is returned in the report field.

Testing from PowerShell
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

Limitations

- MVP does not include persistence (DB) or price/yield data.
- Free-tier Gemini may have rate limits and latency variability.
