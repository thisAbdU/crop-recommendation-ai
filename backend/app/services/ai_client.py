import os
import joblib
import pandas as pd
import numpy as np
from flask import current_app
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AIClient:
    """AI client for crop recommendation using local ML models from ai_model folder"""
    
    def __init__(self):
        self.model_path = current_app.config.get('AGRI_AI_MODEL_PATH', 'ai_model')
        self._init_local_client()
    
    def _init_local_client(self):
        """Initialize local AI client using the ML model from ai_model folder"""
        try:
            # Load the ML model and scaler from ai_model folder
            model_file = os.path.join(self.model_path, 'model', 'crop_rec_model.pkl')
            scaler_file = os.path.join(self.model_path, 'model', 'scaler.pkl')
            
            logger.info(f"Model file path: {model_file}")
            logger.info(f"Scaler file path: {scaler_file}")
            
            if os.path.exists(model_file) and os.path.exists(scaler_file):
                self.model = joblib.load(model_file)
                self.scaler = joblib.load(scaler_file)
                self.crop_classes = self.model.classes_ if hasattr(self.model, 'classes_') else None
                logger.info("ML model and scaler loaded successfully")
            else:
                logger.warning("ML model files not found in ai_model folder, using mock implementation")
                self.model = None
                self.scaler = None
                self.crop_classes = None
                
        except Exception as e:
            logger.error(f"Failed to load ML model from ai_model folder: {str(e)}")
            self.model = None
            self.scaler = None
            self.crop_classes = None
    
    def generate_crop_recommendation(self, sensor_data, weather_data=None, zone_info=None):
        """
        Generate crop recommendation from sensor data and optional weather data
        
        Args:
            sensor_data (dict): IoT sensor readings
            weather_data (dict): Optional weather information
            zone_info (dict): Optional zone information
            
        Returns:
            dict: Recommendation with top 3 crops and analysis
        """
        try:
            if self.model and self.scaler:
                return self._generate_local_recommendation(sensor_data, weather_data, zone_info)
            else:
                logger.warning("ML model not available, using mock recommendation")
                return self._mock_generate_recommendation(sensor_data, weather_data, zone_info)
        except Exception as e:
            logger.error(f"Error generating crop recommendation: {str(e)}")
            return self._mock_generate_recommendation(sensor_data, weather_data, zone_info)
    
    def _generate_local_recommendation(self, sensor_data, weather_data, zone_info):
        """Generate recommendation using local ML model from ai_model folder"""
        try:
            # Prepare features for the model
            features = self._prepare_features(sensor_data, weather_data)
            
            # Validate required features
            required_features = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
            missing_features = [f for f in required_features if f not in features]
            
            if missing_features:
                logger.warning(f"Missing features: {missing_features}, using defaults")
                for feature in missing_features:
                    if feature in ['N', 'P', 'K']:
                        features[feature] = 50.0  # Default nutrient values
                    elif feature == 'temperature':
                        features[feature] = 25.0  # Default temperature
                    elif feature == 'humidity':
                        features[feature] = 70.0  # Default humidity
                    elif feature == 'ph':
                        features[feature] = 6.5   # Default pH
                    elif feature == 'rainfall':
                        features[feature] = 100.0 # Default rainfall
            
            # Create feature vector in correct order
            feature_vector = []
            for feature in required_features:
                feature_vector.append(features[feature])
            
            # Reshape for single prediction
            X = np.array(feature_vector).reshape(1, -1)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Get predictions
            predicted_crop = self.model.predict(X_scaled)[0]
            probabilities = self.model.predict_proba(X_scaled)[0]
            
            # Get top 3 recommendations
            top_3_indices = np.argsort(probabilities)[::-1][:3]
            
            recommendations = []
            for i, idx in enumerate(top_3_indices):
                crop_name = str(self.crop_classes[idx])
                probability = float(probabilities[idx])
                score_percent = round(probability * 100, 1)
                
                recommendations.append({
                    'crop_name': crop_name,
                    'suitability_score': score_percent,
                    'rank': i + 1,
                    'probability': probability,
                    'soil_type': self._classify_soil_from_features(features),
                    'key_environmental_factors': self._get_environmental_factors(features),
                    'rationale_text': self._generate_rationale(crop_name, features, score_percent)
                })
            
            # Generate detailed report
            report = self._generate_detailed_report(recommendations, features, weather_data, zone_info)
            
            return {
                'crops': recommendations,
                'response': report,
                'soil_type': recommendations[0]['soil_type'],
                'confidence': float(probabilities[top_3_indices[0]]),
                'data_quality': self._assess_data_quality(sensor_data),
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in local recommendation generation: {str(e)}")
            return self._mock_generate_recommendation(sensor_data, weather_data, zone_info)
    
    def _prepare_features(self, sensor_data, weather_data):
        """Prepare and normalize features for the ML model"""
        features = {}
        
        # Extract sensor data
        features['N'] = float(sensor_data.get('nitrogen', 50.0))
        features['P'] = float(sensor_data.get('phosphorus', 50.0))
        features['K'] = float(sensor_data.get('potassium', 50.0))
        features['ph'] = float(sensor_data.get('ph', 6.5))
        features['soil_moisture'] = float(sensor_data.get('soil_moisture', 30.0))
        
        # Use weather data if available, otherwise use sensor data
        if weather_data:
            features['temperature'] = float(weather_data.get('temperature', sensor_data.get('temperature', 25.0)))
            features['humidity'] = float(weather_data.get('humidity', sensor_data.get('humidity', 70.0)))
            features['rainfall'] = float(weather_data.get('rainfall', sensor_data.get('rainfall', 100.0)))
        else:
            features['temperature'] = float(sensor_data.get('temperature', 25.0))
            features['humidity'] = float(sensor_data.get('humidity', 70.0))
            features['rainfall'] = float(sensor_data.get('rainfall', 100.0))
        
        # Validate and clamp values
        features['N'] = max(0, min(140, features['N']))
        features['P'] = max(0, min(145, features['P']))
        features['K'] = max(0, min(205, features['K']))
        features['ph'] = max(3.5, min(10.0, features['ph']))
        features['temperature'] = max(-40, min(50, features['temperature']))
        features['humidity'] = max(0, min(100, features['humidity']))
        features['rainfall'] = max(0, min(1000, features['rainfall']))
        
        return features
    
    def _classify_soil_from_features(self, features):
        """Classify soil type based on features"""
        ph = features.get('ph', 6.5)
        moisture = features.get('soil_moisture', 30.0)
        
        if ph < 5.5:
            base_type = 'Acidic'
        elif ph < 6.5:
            base_type = 'Slightly Acidic'
        elif ph < 7.5:
            base_type = 'Neutral'
        elif ph < 8.5:
            base_type = 'Slightly Alkaline'
        else:
            base_type = 'Alkaline'
        
        if moisture < 20:
            texture = 'Sandy'
        elif moisture < 35:
            texture = 'Loamy'
        else:
            texture = 'Clay'
        
        return f"{texture} {base_type}"
    
    def _get_environmental_factors(self, features):
        """Get key environmental factors for crop suitability"""
        return {
            'ph_optimal': f"{features.get('ph', 6.5):.1f}",
            'moisture_optimal': f"{features.get('soil_moisture', 30.0):.1f}%",
            'temperature_optimal': f"{features.get('temperature', 25.0):.1f}°C",
            'nitrogen_level': f"{features.get('N', 50.0):.1f} mg/kg",
            'phosphorus_level': f"{features.get('P', 50.0):.1f} mg/kg",
            'potassium_level': f"{features.get('K', 50.0):.1f} mg/kg"
        }
    
    def _generate_rationale(self, crop_name, features, score):
        """Generate rationale for crop recommendation"""
        ph = features.get('ph', 6.5)
        moisture = features.get('soil_moisture', 30.0)
        temp = features.get('temperature', 25.0)
        
        rationale = f"{crop_name} shows {score}% suitability based on: "
        
        if 6.0 <= ph <= 7.5:
            rationale += "optimal pH levels, "
        elif 5.5 <= ph < 6.0 or 7.5 < ph <= 8.0:
            rationale += "acceptable pH levels, "
        else:
            rationale += "suboptimal pH levels (may require adjustment), "
        
        if 20 <= moisture <= 40:
            rationale += "good soil moisture, "
        elif 15 <= moisture < 20 or 40 < moisture <= 50:
            rationale += "moderate soil moisture, "
        else:
            rationale += "soil moisture may need attention, "
        
        if 20 <= temp <= 30:
            rationale += "and optimal temperature conditions."
        elif 15 <= temp < 20 or 30 < temp <= 35:
            rationale += "and acceptable temperature conditions."
        else:
            rationale += "and temperature conditions may need monitoring."
        
        return rationale
    
    def _generate_detailed_report(self, recommendations, features, weather_data, zone_info):
        """Generate detailed recommendation report"""
        top_crop = recommendations[0]
        
        report = f"# Crop Recommendation Report\n\n"
        report += f"## Executive Summary\n"
        report += f"Based on comprehensive analysis of soil conditions and environmental factors, "
        report += f"**{top_crop['crop_name']}** is recommended as the primary crop with "
        report += f"{top_crop['suitability_score']}% suitability.\n\n"
        
        report += f"## Top 3 Recommendations\n"
        for rec in recommendations:
            report += f"### {rec['rank']}. {rec['crop_name']} ({rec['suitability_score']}%)\n"
            report += f"- {rec['rationale_text']}\n"
            report += f"- Optimal soil type: {rec['soil_type']}\n"
            report += f"- Key factors: pH {rec['key_environmental_factors']['ph_optimal']}, "
            report += f"Moisture {rec['key_environmental_factors']['moisture_optimal']}, "
            report += f"Temperature {rec['key_environmental_factors']['temperature_optimal']}\n\n"
        
        report += f"## Environmental Analysis\n"
        report += f"- **Soil pH**: {features.get('ph', 6.5):.1f} ({self._get_ph_category(features.get('ph', 6.5))})\n"
        report += f"- **Soil Moisture**: {features.get('soil_moisture', 30.0):.1f}% ({self._get_moisture_category(features.get('soil_moisture', 30.0))})\n"
        report += f"- **Temperature**: {features.get('temperature', 25.0):.1f}°C\n"
        report += f"- **Rainfall**: {features.get('rainfall', 100.0):.1f} mm\n"
        report += f"- **Nutrients**: N={features.get('N', 50.0):.1f}, P={features.get('P', 50.0):.1f}, K={features.get('K', 50.0):.1f} mg/kg\n\n"
        
        if weather_data:
            report += f"## Weather Considerations\n"
            report += f"- Current conditions: {weather_data.get('description', 'N/A')}\n"
            report += f"- Wind speed: {weather_data.get('wind_speed', 'N/A')} m/s\n"
            report += f"- Pressure: {weather_data.get('pressure', 'N/A')} hPa\n\n"
        
        report += f"## Recommendations\n"
        report += f"1. **Immediate Actions**: Begin preparation for {top_crop['crop_name']} cultivation\n"
        report += f"2. **Soil Management**: Monitor pH and moisture levels regularly\n"
        report += f"3. **Nutrient Management**: Consider supplementing based on soil test results\n"
        report += f"4. **Weather Monitoring**: Track forecast for optimal planting timing\n\n"
        
        report += f"*Report generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*"
        
        return report
    
    def _get_ph_category(self, ph):
        """Get pH category description"""
        if ph < 5.5:
            return "Very Acidic"
        elif ph < 6.5:
            return "Acidic"
        elif ph < 7.5:
            return "Neutral"
        elif ph < 8.5:
            return "Alkaline"
        else:
            return "Very Alkaline"
    
    def _get_moisture_category(self, moisture):
        """Get moisture category description"""
        if moisture < 15:
            return "Very Dry"
        elif moisture < 25:
            return "Dry"
        elif moisture < 35:
            return "Moderate"
        elif moisture < 45:
            return "Moist"
        else:
            return "Very Moist"
    
    def _assess_data_quality(self, sensor_data):
        """Assess the quality of sensor data"""
        quality_score = 100
        issues = []
        
        # Check for missing critical values
        critical_fields = ['nitrogen', 'phosphorus', 'potassium', 'ph', 'soil_moisture']
        for field in critical_fields:
            if field not in sensor_data or sensor_data[field] is None:
                quality_score -= 20
                issues.append(f"Missing {field}")
        
        # Check for reasonable value ranges
        if 'ph' in sensor_data and sensor_data['ph']:
            if not (3.0 <= sensor_data['ph'] <= 11.0):
                quality_score -= 15
                issues.append("pH out of reasonable range")
        
        if 'soil_moisture' in sensor_data and sensor_data['soil_moisture']:
            if not (0 <= sensor_data['soil_moisture'] <= 100):
                quality_score -= 15
                issues.append("Soil moisture out of reasonable range")
        
        quality_score = max(0, quality_score)
        
        return {
            'score': quality_score,
            'grade': 'A' if quality_score >= 90 else 'B' if quality_score >= 70 else 'C' if quality_score >= 50 else 'D',
            'issues': issues,
            'recommendation': 'High quality data' if quality_score >= 90 else 'Good quality data' if quality_score >= 70 else 'Moderate quality data' if quality_score >= 50 else 'Poor quality data - verification recommended'
        }
    
    def _mock_generate_recommendation(self, sensor_data, weather_data, zone_info):
        """Mock recommendation generation for development/testing when ML model is not available"""
        import random
        
        # Mock crops based on features
        crops = []
        crop_options = [
            {'name': 'Corn', 'base_score': 75},
            {'name': 'Soybeans', 'base_score': 70},
            {'name': 'Wheat', 'base_score': 65},
            {'name': 'Rice', 'base_score': 60},
            {'name': 'Cotton', 'base_score': 55},
            {'name': 'Potatoes', 'base_score': 80},
            {'name': 'Tomatoes', 'base_score': 85},
            {'name': 'Lettuce', 'base_score': 90}
        ]
        
        # Select 3 crops with realistic scoring
        selected_crops = random.sample(crop_options, 3)
        for i, crop in enumerate(selected_crops):
            # Adjust score based on sensor data
            score = crop['base_score']
            if 'ph' in sensor_data and sensor_data['ph']:
                if 6.0 <= sensor_data['ph'] <= 7.5:
                    score += random.randint(5, 15)
                elif 5.5 <= sensor_data['ph'] < 6.0 or 7.5 < sensor_data['ph'] <= 8.0:
                    score += random.randint(0, 10)
                else:
                    score -= random.randint(5, 15)
            
            if 'soil_moisture' in sensor_data and sensor_data['soil_moisture']:
                if 20 <= sensor_data['soil_moisture'] <= 40:
                    score += random.randint(5, 15)
                elif 15 <= sensor_data['soil_moisture'] < 20 or 40 < sensor_data['soil_moisture'] <= 50:
                    score += random.randint(0, 10)
                else:
                    score -= random.randint(5, 15)
            
            # Clamp score
            score = max(30, min(95, score))
            
            crops.append({
                'crop_name': crop['name'],
                'suitability_score': score,
                'rank': i + 1,
                'probability': score / 100,
                'soil_type': random.choice(['Loamy', 'Clay', 'Sandy', 'Silt']),
                'key_environmental_factors': {
                    'ph_optimal': f"{random.uniform(5.5, 7.5):.1f}",
                    'moisture_optimal': f"{random.uniform(20, 40):.1f}%",
                    'temperature_optimal': f"{random.uniform(20, 30):.1f}°C"
                },
                'rationale_text': f"Based on the soil and environmental conditions, {crop['name']} shows good suitability for this zone."
            })
        
        # Sort by score
        crops.sort(key=lambda x: x['suitability_score'], reverse=True)
        for i, crop in enumerate(crops):
            crop['rank'] = i + 1
        
        response_text = f"Based on the analysis of sensor data, here are the recommended crops:\n\n"
        for crop in crops:
            response_text += f"• {crop['crop_name']} (Suitability: {crop['suitability_score']}%)\n"
            response_text += f"  - Soil Type: {crop['soil_type']}\n"
            response_text += f"  - {crop['rationale_text']}\n\n"
        
        return {
            'crops': crops,
            'response': response_text,
            'soil_type': crops[0]['soil_type'],
            'confidence': crops[0]['suitability_score'] / 100,
            'data_quality': self._assess_data_quality(sensor_data),
            'generated_at': datetime.utcnow().isoformat()
        }
    
    def test_connection(self):
        """Test connection to local AI service"""
        try:
            return self.model is not None and self.scaler is not None
        except Exception as e:
            logger.error(f"Local AI service connection test failed: {str(e)}")
            return False 