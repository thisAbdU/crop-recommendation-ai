import os
import joblib
import pandas as pd
import numpy as np
from flask import current_app
import logging
from datetime import datetime, timedelta
from app.services.gemini_service import GeminiService
from app.services.internet_service import InternetService

logger = logging.getLogger(__name__)

class AIClient:
    """AI client for crop recommendation using local ML models from ai_model folder"""
    
    def __init__(self):
        self.model_path = current_app.config.get('AGRI_AI_MODEL_PATH', 'ai_model')
        self.gemini_service = GeminiService()
        self.internet_service = InternetService()
        self._init_local_client()
    
    def _init_local_client(self):
        """Initialize local AI client using the ML model from ai_model folder"""
        try:
            # Get the model path from config
            config_path = current_app.config.get('AGRI_AI_MODEL_PATH', 'ai_model')
            
            # Use the config path directly if it's absolute, otherwise make it relative to app root
            if os.path.isabs(config_path):
                self.model_path = config_path
            else:
                # Get the app root directory (where the Flask app runs)
                app_root = current_app.root_path
                self.model_path = os.path.join(app_root, config_path)
            
            # Load the ML model and scaler
            model_file = os.path.join(self.model_path, 'model', 'crop_rec_model.pkl')
            scaler_file = os.path.join(self.model_path, 'model', 'scaler.pkl')
            
            # List contents for debugging
            if os.path.exists(self.model_path):
                logger.info(f"Contents of {self.model_path}: {os.listdir(self.model_path)}")
                model_dir = os.path.join(self.model_path, 'model')
                if os.path.exists(model_dir):
                    logger.info(f"Contents of {model_dir}: {os.listdir(model_dir)}")
            
            if os.path.exists(model_file) and os.path.exists(scaler_file):
                self.model = joblib.load(model_file)
                self.scaler = joblib.load(scaler_file)
                self.ai_mode = 'local'
                logger.info("✅ Local ML model loaded successfully!")
            else:
                logger.warning(f"❌ ML model files not found, using mock implementation")
                self.model = None
                self.scaler = None
                self.ai_mode = 'mock'
                
        except Exception as e:
            logger.error(f"❌ Failed to load ML model: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.model = None
            self.scaler = None
            self.ai_mode = 'mock'
    
    def chat_with_ai(self, context: dict, prompt_template: dict = None) -> str:
        """
        Chat with AI about agricultural topics using Gemini and internet data
        
        Args:
            context (dict): Chat context including user message and zone data
            prompt_template (dict): Optional prompt template configuration
            
        Returns:
            str: AI-generated response
        """
        try:
            # Validate if the query is agricultural
            user_message = context.get('user_message', '')
            validation_result = self.gemini_service.validate_agricultural_query(user_message)
            
            if not validation_result['is_agricultural']:
                return validation_result['suggestion']
            
            # Get zone information for context
            zone_info = self._extract_zone_info(context)
            
            # Get current agricultural context from internet
            agricultural_context = self.internet_service.get_zone_agricultural_context(zone_info)
            
            # Build enhanced context for AI with crop focus
            enhanced_context = self._build_enhanced_context(context, agricultural_context, zone_info)
            
            # Get prompt template content
            prompt_content = self._get_prompt_content(prompt_template, context)
            
            # Generate response using Gemini
            response = self.gemini_service.generate_agricultural_response(
                prompt_content,
                enhanced_context,
                context.get('conversation_history', [])
            )
            
            logger.info(f"AI chat response generated successfully for zone {zone_info.get('id', 'unknown')}")
            return response
            
        except Exception as e:
            logger.error(f"Error in chat_with_ai: {str(e)}")
            return "I'm experiencing technical difficulties. Please try asking your agricultural question again, or contact support if the issue persists."
    
    def _extract_zone_info(self, context: dict) -> dict:
        """Extract zone information from context"""
        try:
            zone_info = {}
            
            # Extract from recommendation data
            if 'recommendation' in context:
                rec = context['recommendation']
                zone_info['id'] = rec.get('zone_id')
                
                # Get zone details from database if available
                try:
                    from app.models import Zone
                    zone = Zone.query.get(rec.get('zone_id'))
                    if zone:
                        zone_info.update({
                            'name': zone.name,
                            'type': zone.zone_type,
                            'area_hectare': float(zone.area_hectare) if zone.area_hectare else None,
                            'latitude': float(zone.latitude) if zone.latitude else None,
                            'longitude': float(zone.longitude) if zone.longitude else None,
                            'admin_region': zone.name  # Use zone name as admin region for now
                        })
                except Exception as e:
                    logger.warning(f"Could not fetch zone details: {str(e)}")
            
            return zone_info
            
        except Exception as e:
            logger.error(f"Error extracting zone info: {str(e)}")
            return {}
    
    def _build_enhanced_context(self, context: dict, agricultural_context: dict, zone_info: dict) -> dict:
        """Build enhanced context for AI chat with crop recommendation focus"""
        try:
            enhanced_context = context.copy()
            
            # Add zone information
            enhanced_context['zone_id'] = zone_info.get('id')
            enhanced_context['zone_name'] = zone_info.get('name', 'Unknown Zone')
            enhanced_context['zone_type'] = zone_info.get('type', 'Agricultural')
            enhanced_context['area_hectare'] = zone_info.get('area_hectare')
            enhanced_context['latitude'] = zone_info.get('latitude')
            enhanced_context['longitude'] = zone_info.get('longitude')
            enhanced_context['admin_region'] = zone_info.get('admin_region')
            
            # Add environmental data with crop focus
            if 'recommendation' in context:
                rec = context['recommendation']
                enhanced_context['soil_conditions'] = {
                    'ph': rec.get('data_used', {}).get('ph'),
                    'nitrogen': rec.get('data_used', {}).get('N'),
                    'phosphorus': rec.get('data_used', {}).get('P'),
                    'potassium': rec.get('data_used', {}).get('K'),
                    'moisture': rec.get('data_used', {}).get('humidity'),
                    'temperature': rec.get('data_used', {}).get('temperature'),
                    'rainfall': rec.get('data_used', {}).get('rainfall')
                }
                
                enhanced_context['crop_recommendations'] = rec.get('crops', [])
                enhanced_context['sensor_data'] = rec.get('data_used', {})
                enhanced_context['data_used'] = rec.get('data_used', {})
                
                # Add recommendation metadata
                enhanced_context['recommendation_metadata'] = {
                    'id': rec.get('id'),
                    'status': rec.get('status'),
                    'created_at': rec.get('created_at'),
                    'confidence_score': rec.get('confidence_score')
                }
            
            # Add current agricultural context
            enhanced_context['weather_data'] = agricultural_context.get('weather', {})
            enhanced_context['weather_forecasts'] = agricultural_context.get('weather_forecast', {})
            enhanced_context['recent_news'] = agricultural_context.get('news', [])
            enhanced_context['market_trends'] = agricultural_context.get('market_trends', {})
            enhanced_context['regional_developments'] = agricultural_context.get('regional_data', {})
            
            # Add seasonal factors
            current_month = datetime.utcnow().month
            if current_month in [12, 1, 2]:
                season = 'Winter'
            elif current_month in [3, 4, 5]:
                season = 'Spring'
            elif current_month in [6, 7, 8]:
                season = 'Summer'
            else:
                season = 'Autumn'
            
            enhanced_context['seasonal_factors'] = {
                'current_season': season,
                'current_month': current_month,
                'planting_season': season in ['Spring', 'Summer'],
                'harvest_season': season in ['Autumn', 'Summer']
            }
            
            # Add crop-specific context if available
            if 'crop_recommendations' in enhanced_context and enhanced_context['crop_recommendations']:
                enhanced_context['crop_context'] = self._build_crop_context(enhanced_context['crop_recommendations'])
            
            return enhanced_context
            
        except Exception as e:
            logger.error(f"Error building enhanced context: {str(e)}")
            return context
    
    def _build_crop_context(self, crops: list) -> dict:
        """Build specialized context for recommended crops"""
        try:
            crop_context = {}
            
            for crop in crops:
                if isinstance(crop, dict):
                    crop_name = crop.get('crop', crop.get('name', 'Unknown'))
                    confidence = crop.get('confidence', crop.get('score', 0))
                    
                    crop_context[crop_name] = {
                        'confidence': confidence,
                        'requirements': self._get_crop_requirements(crop_name),
                        'seasonal_info': self._get_crop_seasonal_info(crop_name),
                        'management_tips': self._get_crop_management_tips(crop_name)
                    }
                else:
                    crop_name = str(crop)
                    crop_context[crop_name] = {
                        'confidence': 0.8,
                        'requirements': self._get_crop_requirements(crop_name),
                        'seasonal_info': self._get_crop_seasonal_info(crop_name),
                        'management_tips': self._get_crop_management_tips(crop_name)
                    }
            
            return crop_context
            
        except Exception as e:
            logger.error(f"Error building crop context: {str(e)}")
            return {}
    
    def _get_crop_requirements(self, crop_name: str) -> dict:
        """Get basic requirements for a specific crop"""
        # This could be enhanced with a crop database or API
        crop_requirements = {
            'rice': {
                'soil_ph': '5.5-6.5',
                'temperature': '20-35°C',
                'water': 'High',
                'nutrients': 'High N, moderate P, moderate K'
            },
            'wheat': {
                'soil_ph': '6.0-7.5',
                'temperature': '15-25°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, high P, moderate K'
            },
            'maize': {
                'soil_ph': '5.5-7.5',
                'temperature': '18-32°C',
                'water': 'Moderate to high',
                'nutrients': 'High N, moderate P, moderate K'
            },
            'cotton': {
                'soil_ph': '5.5-8.5',
                'temperature': '20-35°C',
                'water': 'Moderate',
                'nutrients': 'High N, moderate P, moderate K'
            },
            'jute': {
                'soil_ph': '6.0-7.5',
                'temperature': '24-37°C',
                'water': 'High',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'coconut': {
                'soil_ph': '5.5-8.0',
                'temperature': '20-32°C',
                'water': 'High',
                'nutrients': 'Moderate N, moderate P, high K'
            },
            'papaya': {
                'soil_ph': '5.5-7.0',
                'temperature': '21-33°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'orange': {
                'soil_ph': '6.0-7.5',
                'temperature': '13-37°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, moderate P, high K'
            },
            'apple': {
                'soil_ph': '6.0-7.0',
                'temperature': '7-35°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'muskmelon': {
                'soil_ph': '6.0-7.5',
                'temperature': '18-35°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'watermelon': {
                'soil_ph': '5.5-7.5',
                'temperature': '21-35°C',
                'water': 'High',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'grapes': {
                'soil_ph': '5.5-7.5',
                'temperature': '15-35°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'mango': {
                'soil_ph': '5.5-7.5',
                'temperature': '21-37°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'banana': {
                'soil_ph': '5.5-7.5',
                'temperature': '20-35°C',
                'water': 'High',
                'nutrients': 'High N, moderate P, high K'
            },
            'pomegranate': {
                'soil_ph': '5.5-7.5',
                'temperature': '15-35°C',
                'water': 'Moderate',
                'nutrients': 'Moderate N, moderate P, moderate K'
            },
            'lentil': {
                'soil_ph': '6.0-7.5',
                'temperature': '15-30°C',
                'water': 'Low to moderate',
                'nutrients': 'Low N, moderate P, moderate K'
            },
            'blackgram': {
                'soil_ph': '6.0-7.5',
                'temperature': '20-35°C',
                'water': 'Moderate',
                'nutrients': 'Low N, moderate P, moderate K'
            },
            'mungbean': {
                'soil_ph': '6.0-7.5',
                'temperature': '20-35°C',
                'water': 'Moderate',
                'nutrients': 'Low N, moderate P, moderate K'
            },
            'mothbean': {
                'soil_ph': '6.0-7.5',
                'temperature': '20-35°C',
                'water': 'Low',
                'nutrients': 'Low N, moderate P, moderate K'
            },
            'pigeonpeas': {
                'soil_ph': '6.0-7.5',
                'temperature': '20-35°C',
                'water': 'Low to moderate',
                'nutrients': 'Low N, moderate P, moderate K'
            },
            'kidneybeans': {
                'soil_ph': '6.0-7.5',
                'temperature': '15-30°C',
                'water': 'Moderate',
                'nutrients': 'Low N, moderate P, moderate K'
            },
            'chickpea': {
                'soil_ph': '6.0-7.5',
                'temperature': '15-30°C',
                'water': 'Low to moderate',
                'nutrients': 'Low N, moderate P, moderate K'
            }
        }
        
        return crop_requirements.get(crop_name.lower(), {
            'soil_ph': '6.0-7.0',
            'temperature': '20-30°C',
            'water': 'Moderate',
            'nutrients': 'Moderate N, moderate P, moderate K'
        })
    
    def _get_crop_seasonal_info(self, crop_name: str) -> dict:
        """Get seasonal information for a specific crop"""
        # This could be enhanced with a crop database or API
        seasonal_info = {
            'rice': {'planting': 'Spring/Summer', 'harvest': 'Autumn', 'growing_period': '3-6 months'},
            'wheat': {'planting': 'Winter', 'harvest': 'Spring', 'growing_period': '6-8 months'},
            'maize': {'planting': 'Spring', 'harvest': 'Summer/Autumn', 'growing_period': '3-4 months'},
            'cotton': {'planting': 'Spring', 'harvest': 'Autumn', 'growing_period': '5-6 months'},
            'jute': {'planting': 'Spring', 'harvest': 'Summer', 'growing_period': '3-4 months'},
            'coconut': {'planting': 'Year-round', 'harvest': 'Year-round', 'growing_period': '6-10 years'},
            'papaya': {'planting': 'Spring', 'harvest': 'Year-round', 'growing_period': '6-12 months'},
            'orange': {'planting': 'Spring', 'harvest': 'Winter', 'growing_period': '3-5 years'},
            'apple': {'planting': 'Spring', 'harvest': 'Autumn', 'growing_period': '3-5 years'},
            'muskmelon': {'planting': 'Spring', 'harvest': 'Summer', 'growing_period': '3-4 months'},
            'watermelon': {'planting': 'Spring', 'harvest': 'Summer', 'growing_period': '3-4 months'},
            'grapes': {'planting': 'Spring', 'harvest': 'Summer/Autumn', 'growing_period': '2-3 years'},
            'mango': {'planting': 'Spring', 'harvest': 'Summer', 'growing_period': '3-5 years'},
            'banana': {'planting': 'Year-round', 'harvest': 'Year-round', 'growing_period': '9-12 months'},
            'pomegranate': {'planting': 'Spring', 'harvest': 'Autumn', 'growing_period': '3-5 years'},
            'lentil': {'planting': 'Winter', 'harvest': 'Spring', 'growing_period': '4-5 months'},
            'blackgram': {'planting': 'Summer', 'harvest': 'Autumn', 'growing_period': '3-4 months'},
            'mungbean': {'planting': 'Summer', 'harvest': 'Autumn', 'growing_period': '3-4 months'},
            'mothbean': {'planting': 'Summer', 'harvest': 'Autumn', 'growing_period': '3-4 months'},
            'pigeonpeas': {'planting': 'Summer', 'harvest': 'Winter', 'growing_period': '5-7 months'},
            'kidneybeans': {'planting': 'Spring', 'harvest': 'Summer', 'growing_period': '3-4 months'},
            'chickpea': {'planting': 'Winter', 'harvest': 'Spring', 'growing_period': '4-5 months'}
        }
        
        return seasonal_info.get(crop_name.lower(), {
            'planting': 'Spring',
            'harvest': 'Autumn',
            'growing_period': '3-6 months'
        })
    
    def _get_crop_management_tips(self, crop_name: str) -> list:
        """Get management tips for a specific crop"""
        # This could be enhanced with a crop database or API
        management_tips = {
            'rice': [
                'Maintain consistent water level during growing season',
                'Apply nitrogen fertilizer in split doses',
                'Control weeds early in the growing season',
                'Monitor for rice blast disease'
            ],
            'wheat': [
                'Ensure proper seedbed preparation',
                'Apply phosphorus at planting',
                'Control rust diseases with fungicides',
                'Harvest when grain moisture is 13-14%'
            ],
            'maize': [
                'Plant at proper depth (2-3 inches)',
                'Maintain adequate plant population',
                'Apply nitrogen in split applications',
                'Control corn borers and earworms'
            ],
            'cotton': [
                'Plant when soil temperature reaches 60°F',
                'Control bollworms and aphids',
                'Apply growth regulators if needed',
                'Harvest when 60% of bolls are open'
            ]
        }
        
        return management_tips.get(crop_name.lower(), [
            'Ensure proper soil preparation',
            'Monitor for pests and diseases',
            'Apply fertilizers based on soil test results',
            'Maintain adequate irrigation'
        ])
    
    def _get_prompt_content(self, prompt_template: dict, context: dict) -> str:
        """Get prompt template content"""
        try:
            if not prompt_template:
                # Use default zone admin chat template
                return self._get_default_zone_admin_prompt()
            
            # Try to get template content from file
            try:
                from app.services.prompt_service import PromptService
                prompt_service = PromptService()
                template_content = prompt_service.get_template_content(prompt_template['id'])
                return template_content
            except Exception as e:
                logger.warning(f"Could not load prompt template: {str(e)}")
                return self._get_default_zone_admin_prompt()
                
        except Exception as e:
            logger.error(f"Error getting prompt content: {str(e)}")
            return self._get_default_zone_admin_prompt()
    
    def _get_default_zone_admin_prompt(self) -> str:
        """Get default zone admin chat prompt"""
        return """# Zone Admin Agricultural AI Assistant

You are an expert agricultural AI assistant specialized in providing comprehensive guidance for zone administrators. Your role is to help with crop management, soil analysis, weather considerations, and agricultural best practices specific to the zone you're assisting.

## IMPORTANT RULES:
1. **ONLY answer questions related to agriculture, farming, crops, soil, weather, and zone management**
2. **NEVER answer questions about politics, current events, or any non-agricultural topics**
3. **Always provide zone-specific, contextual advice based on the available data and crop recommendations**
4. **Use current weather and environmental data when available**
5. **Reference recent agricultural news and developments in the region when relevant**
6. **Focus on the specific crops recommended for this zone and their requirements**
7. **Provide actionable advice for farming practices, crop management, and soil health**

## Zone Context:
- **Zone ID**: {{ zone_id }}
- **Zone Name**: {{ zone_name }}
- **Zone Type**: {{ zone_type }}
- **Area**: {{ area_hectare }} hectares
- **Location**: {{ latitude }}, {{ longitude }}
- **Administrative Region**: {{ admin_region }}

## Current Environmental Data:
- **Soil Conditions**: {{ soil_conditions }}
- **Weather Data**: {{ weather_data }}
- **Recent Sensor Readings**: {{ sensor_data }}
- **Seasonal Factors**: {{ seasonal_factors }}

## Crop Recommendations (Current):
{{ crop_recommendations }}

## Recent Crop Data Used for Recommendations:
{{ data_used }}

## Current Agricultural Context:
- **Recent Agricultural News**: {{ recent_news }}
- **Market Trends**: {{ market_trends }}
- **Regional Developments**: {{ regional_developments }}
- **Weather Forecasts**: {{ weather_forecasts }}

## Conversation Context:
{{ conversation_context }}

## User Query:
{{ user_message }}

## Response Guidelines:
1. **Be specific to the zone's conditions and current crop recommendations**
2. **Provide actionable agricultural advice with current best practices**
3. **Reference current environmental data and weather forecasts**
4. **Suggest optimal practices for the specific crops recommended**
5. **Consider seasonal factors, local agricultural practices, and current research**
6. **Integrate relevant current agricultural news and market information**
7. **If asked about non-agricultural topics, politely redirect to farming-related subjects**
8. **Use internet data to provide up-to-date information on agricultural innovations, pest management, and sustainable practices**
9. **Address questions about crop management, fertilization, irrigation, pest control, and harvesting**
10. **Provide guidance on crop rotation, soil health improvement, and sustainable farming practices**

## Specialized Response Areas:
- **Crop Management**: Planting schedules, spacing, watering, fertilization
- **Soil Health**: pH management, nutrient balancing, organic matter improvement
- **Pest & Disease Control**: Integrated pest management, disease prevention
- **Weather Adaptation**: Drought resistance, flood management, seasonal planning
- **Market Intelligence**: Crop pricing, demand trends, export opportunities
- **Technology Integration**: IoT sensors, precision agriculture, automation
- **Sustainability**: Organic farming, conservation practices, resource efficiency

## Response Format:
Provide a comprehensive, helpful response that directly addresses the user's agricultural question while staying within the scope of farming and zone management. Include specific recommendations based on the zone's current conditions, crop recommendations, and current agricultural knowledge. Reference recent developments and best practices when relevant.

## Internet Integration Focus:
- Agricultural research and innovations
- Pest and disease management updates
- Sustainable farming practices
- Market trends for agricultural products
- Weather-related agricultural advisories
- Regional agricultural developments
- Crop-specific best practices and research

Remember: You are a specialized agricultural AI assistant with internet access. Stay focused on farming, crops, soil, weather, and zone management topics only. Use current data to provide the most relevant and up-to-date agricultural advice. Always relate your responses to the specific crops recommended for this zone and their current growing conditions."""
    
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