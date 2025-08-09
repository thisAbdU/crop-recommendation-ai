from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

model = joblib.load('model/crop_rec_model.pkl')
scaler = joblib.load('model/scaler.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json  # e.g., {"N":90, "P":42, "K":43, "temperature":20.88, "humidity":82, "ph":6.5, "rainfall":202.94}
    input_df = pd.DataFrame([data])
    input_df = scaler.transform(input_df)
    pred = model.predict(input_df)[0]
    return jsonify({'recommended_crop': pred})

if __name__ == '__main__':
    app.run(debug=True)