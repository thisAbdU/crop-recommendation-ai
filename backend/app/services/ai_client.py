import os
import requests
import json
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class AIClient:
    """Client for interacting with AI services (local agri_ai package or remote service)"""
    
    def __init__(self):
        self.ai_mode = current_app.config.get('AI_MODE', 'local')
        self.model_path = current_app.config.get('AGRI_AI_MODEL_PATH')
        self.remote_url = current_app.config.get('AI_REMOTE_URL')
        
        if self.ai_mode == 'local':
            self._init_local_client()
        else:
            self._init_remote_client()
    
    def _init_local_client(self):
        """Initialize local AI client using agri_ai package"""
        try:
            # Import agri_ai package (this would be installed separately)
            import agri_ai
            self.ai_client = agri_ai
            logger.info("Local AI client initialized successfully")
        except ImportError:
            logger.warning("agri_ai package not found, using mock implementation")
            self.ai_client = MockAIClient()
    
    def _init_remote_client(self):
        """Initialize remote AI client"""
        if not self.remote_url:
            raise ValueError("AI_REMOTE_URL must be set for remote AI mode")
        logger.info(f"Remote AI client initialized with URL: {self.remote_url}")
    
    def generate_recommendation_from_aggregates(self, zone_id, start, end, aggregated_features, prompt_template_id=None):
        """Generate crop recommendation from aggregated features"""
        try:
            if self.ai_mode == 'local':
                return self._generate_local_recommendation(zone_id, start, end, aggregated_features, prompt_template_id)
            else:
                return self._generate_remote_recommendation(zone_id, start, end, aggregated_features, prompt_template_id)
        except Exception as e:
            logger.error(f"Error generating recommendation: {str(e)}")
            raise
    
    def _generate_local_recommendation(self, zone_id, start, end, aggregated_features, prompt_template_id):
        """Generate recommendation using local agri_ai package"""
        try:
            # Call the local AI package
            result = self.ai_client.generate_recommendation_from_aggregates(
                zone_id=zone_id,
                start_time=start,
                end_time=end,
                aggregated_features=aggregated_features,
                prompt_template_id=prompt_template_id
            )
            return result
        except AttributeError:
            # Fallback to mock implementation
            return self._mock_generate_recommendation(zone_id, aggregated_features)
    
    def _generate_remote_recommendation(self, zone_id, start, end, aggregated_features, prompt_template_id):
        """Generate recommendation using remote AI service"""
        payload = {
            'zone_id': zone_id,
            'start_time': start.isoformat() if start else None,
            'end_time': end.isoformat() if end else None,
            'aggregated_features': aggregated_features,
            'prompt_template_id': prompt_template_id
        }
        
        response = requests.post(
            f"{self.remote_url}/generate_recommendation",
            json=payload,
            timeout=300  # 5 minutes timeout
        )
        
        if response.status_code != 200:
            raise Exception(f"Remote AI service error: {response.status_code} - {response.text}")
        
        return response.json()
    
    def classify_soil(self, features):
        """Classify soil type from features"""
        try:
            if self.ai_mode == 'local':
                return self._classify_soil_local(features)
            else:
                return self._classify_soil_remote(features)
        except Exception as e:
            logger.error(f"Error classifying soil: {str(e)}")
            raise
    
    def _classify_soil_local(self, features):
        """Classify soil using local agri_ai package"""
        try:
            result = self.ai_client.classify_soil(features)
            return result
        except AttributeError:
            # Fallback to mock implementation
            return self._mock_classify_soil(features)
    
    def _classify_soil_remote(self, features):
        """Classify soil using remote AI service"""
        payload = {'features': features}
        
        response = requests.post(
            f"{self.remote_url}/classify_soil",
            json=payload,
            timeout=60
        )
        
        if response.status_code != 200:
            raise Exception(f"Remote AI service error: {response.status_code} - {response.text}")
        
        return response.json()
    
    def search_similar(self, features, k=10):
        """Search for similar historical examples"""
        try:
            if self.ai_mode == 'local':
                return self._search_similar_local(features, k)
            else:
                return self._search_similar_remote(features, k)
        except Exception as e:
            logger.error(f"Error searching similar examples: {str(e)}")
            raise
    
    def _search_similar_local(self, features, k):
        """Search similar examples using local agri_ai package"""
        try:
            result = self.ai_client.search_similar(features, k=k)
            return result
        except AttributeError:
            # Fallback to mock implementation
            return self._mock_search_similar(features, k)
    
    def _search_similar_remote(self, features, k):
        """Search similar examples using remote AI service"""
        payload = {'features': features, 'k': k}
        
        response = requests.post(
            f"{self.remote_url}/search_similar",
            json=payload,
            timeout=60
        )
        
        if response.status_code != 200:
            raise Exception(f"Remote AI service error: {response.status_code} - {response.text}")
        
        return response.json()
    
    def chat_with_ai(self, context, prompt_template=None):
        """Chat with AI about a recommendation"""
        try:
            if self.ai_mode == 'local':
                return self._chat_local(context, prompt_template)
            else:
                return self._chat_remote(context, prompt_template)
        except Exception as e:
            logger.error(f"Error in AI chat: {str(e)}")
            raise
    
    def _chat_local(self, context, prompt_template):
        """Chat using local agri_ai package"""
        try:
            result = self.ai_client.chat_with_ai(context, prompt_template)
            return result
        except AttributeError:
            # Fallback to mock implementation
            return self._mock_chat(context)
    
    def _chat_remote(self, context, prompt_template):
        """Chat using remote AI service"""
        payload = {
            'context': context,
            'prompt_template': prompt_template
        }
        
        response = requests.post(
            f"{self.remote_url}/chat",
            json=payload,
            timeout=120
        )
        
        if response.status_code != 200:
            raise Exception(f"Remote AI service error: {response.status_code} - {response.text}")
        
        return response.json().get('response', 'Sorry, I could not process your request.')
    
    def test_connection(self):
        """Test connection to AI service"""
        try:
            if self.ai_mode == 'local':
                # Test local package import
                import agri_ai
                return True
            else:
                # Test remote service
                response = requests.get(f"{self.remote_url}/health", timeout=10)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"AI service connection test failed: {str(e)}")
            return False
    
    # Mock implementations for development/testing
    def _mock_generate_recommendation(self, zone_id, aggregated_features):
        """Mock recommendation generation for development"""
        import random
        
        # Mock crops based on features
        crops = []
        crop_options = [
            {'name': 'Corn', 'suitability_score': random.randint(70, 95)},
            {'name': 'Soybeans', 'suitability_score': random.randint(65, 90)},
            {'name': 'Wheat', 'suitability_score': random.randint(60, 85)},
            {'name': 'Rice', 'suitability_score': random.randint(55, 80)},
            {'name': 'Cotton', 'suitability_score': random.randint(50, 75)}
        ]
        
        # Select 2-3 crops
        selected_crops = random.sample(crop_options, random.randint(2, 3))
        for crop in selected_crops:
            crops.append({
                'crop_name': crop['name'],
                'suitability_score': crop['suitability_score'],
                'soil_type': random.choice(['Loamy', 'Clay', 'Sandy', 'Silt']),
                'key_environmental_factors': {
                    'ph_optimal': f"{random.uniform(5.5, 7.5):.1f}",
                    'moisture_optimal': f"{random.uniform(20, 40):.1f}%",
                    'temperature_optimal': f"{random.uniform(20, 30):.1f}°C"
                },
                'rationale_text': f"Based on the soil and environmental conditions, {crop['name']} shows good suitability for this zone."
            })
        
        response_text = f"Based on the analysis of zone {zone_id} data, here are the recommended crops:\n\n"
        for crop in crops:
            response_text += f"• {crop['crop_name']} (Suitability: {crop['suitability_score']}%)\n"
            response_text += f"  - Soil Type: {crop['soil_type']}\n"
            response_text += f"  - {crop['rationale_text']}\n\n"
        
        return {
            'crops': crops,
            'response': response_text,
            'soil_type': random.choice(['Loamy', 'Clay', 'Sandy', 'Silt'])
        }
    
    def _mock_classify_soil(self, features):
        """Mock soil classification"""
        import random
        
        soil_types = ['Loamy', 'Clay', 'Sandy', 'Silt', 'Peaty', 'Chalky']
        return {
            'soil_type': random.choice(soil_types),
            'confidence': random.uniform(0.7, 0.95)
        }
    
    def _mock_search_similar(self, features, k):
        """Mock similar examples search"""
        import random
        
        examples = []
        for i in range(min(k, 5)):
            examples.append({
                'id': random.randint(1000, 9999),
                'similarity_score': random.uniform(0.6, 0.9),
                'crop_name': random.choice(['Corn', 'Soybeans', 'Wheat', 'Rice', 'Cotton']),
                'yield_performance': random.uniform(0.7, 1.2)
            })
        
        return examples
    
    def _mock_chat(self, context):
        """Mock AI chat response"""
        user_message = context.get('user_message', '')
        
        if 'crop' in user_message.lower():
            return "Based on the soil and environmental conditions in this zone, I recommend focusing on crops that thrive in the current pH and moisture levels. The sensor data shows optimal conditions for several crop types."
        elif 'soil' in user_message.lower():
            return "The soil analysis indicates good nutrient levels and appropriate pH for most agricultural crops. The moisture retention is within optimal ranges for crop growth."
        else:
            return "I can help you understand the crop recommendations for this zone. The analysis is based on comprehensive soil and environmental data collected from IoT sensors."


class MockAIClient:
    """Mock AI client for development when agri_ai package is not available"""
    
    def generate_recommendation_from_aggregates(self, **kwargs):
        return AIClient()._mock_generate_recommendation(kwargs.get('zone_id'), kwargs.get('aggregated_features'))
    
    def classify_soil(self, features):
        return AIClient()._mock_classify_soil(features)
    
    def search_similar(self, features, k=10):
        return AIClient()._mock_search_similar(features, k)
    
    def chat_with_ai(self, context, prompt_template=None):
        return AIClient()._mock_chat(context) 