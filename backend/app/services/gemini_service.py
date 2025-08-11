import os
import google.generativeai as genai
import logging
from typing import Dict, List, Optional
from flask import current_app
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class GeminiService:
    """Service for Gemini AI integration with agricultural focus"""
    
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.model_name = 'gemini-1.5-flash'
        self.model = None
        self._init_gemini()
    
    def _init_gemini(self):
        """Initialize Gemini AI client"""
        try:
            if not self.api_key:
                logger.warning("Gemini API key not configured")
                return
            
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
            logger.info("✅ Gemini AI service initialized successfully!")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini AI: {str(e)}")
            self.model = None
    
    def is_available(self) -> bool:
        """Check if Gemini service is available"""
        return self.model is not None and self.api_key is not None
    
    def generate_agricultural_response(
        self, 
        prompt_template: str, 
        context: Dict,
        conversation_history: List[Dict] = None
    ) -> str:
        """Generate agricultural response using Gemini AI"""
        try:
            if not self.is_available():
                return self._generate_fallback_response(context)
            
            # Build the complete prompt with context
            full_prompt = self._build_complete_prompt(prompt_template, context, conversation_history)
            
            # Generate response with safety settings
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
            
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 1024,
            }
            
            response = self.model.generate_content(
                full_prompt,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            if response.text:
                return response.text.strip()
            else:
                logger.warning("Empty response from Gemini AI")
                return self._generate_fallback_response(context)
                
        except Exception as e:
            logger.error(f"Error generating Gemini response: {str(e)}")
            return self._generate_fallback_response(context)
    
    def _build_complete_prompt(
        self, 
        prompt_template: str, 
        context: Dict, 
        conversation_history: List[Dict] = None
    ) -> str:
        """Build complete prompt with context and conversation history"""
        try:
            # Start with the base template
            prompt = prompt_template
            
            # Add conversation history if available
            if conversation_history:
                history_text = "\n\n## Recent Conversation History:\n"
                for msg in conversation_history[-5:]:  # Last 5 messages
                    role = "User" if msg['role'] == 'user' else "Assistant"
                    history_text += f"{role}: {msg['message_text']}\n"
                prompt += history_text
            
            # Add current timestamp
            prompt += f"\n\n## Current Time: {datetime.utcnow().isoformat()}"
            
            # Add instruction to stay focused
            prompt += "\n\nIMPORTANT: Remember to ONLY answer questions related to agriculture, farming, crops, soil, weather, and zone management. If asked about non-agricultural topics, politely redirect the conversation to farming-related subjects."
            
            return prompt
            
        except Exception as e:
            logger.error(f"Error building complete prompt: {str(e)}")
            return prompt_template
    
    def _generate_fallback_response(self, context: Dict) -> str:
        """Generate fallback response when Gemini is unavailable"""
        try:
            user_message = context.get('user_message', '').lower()
            
            # Simple keyword-based responses for common agricultural queries
            if any(word in user_message for word in ['soil', 'ph', 'nutrient']):
                return "I can help you with soil analysis and nutrient management. Based on your zone's current conditions, I recommend regular soil testing and maintaining optimal pH levels for your crops."
            
            elif any(word in user_message for word in ['water', 'irrigation', 'moisture']):
                return "For water management, consider your zone's current soil moisture levels and weather forecast. Proper irrigation timing is crucial for optimal crop growth."
            
            elif any(word in user_message for word in ['fertilizer', 'nutrient', 'npk']):
                return "Fertilizer application should be based on soil test results and crop requirements. Your zone's current nutrient levels will help determine the right application rates."
            
            elif any(word in user_message for word in ['pest', 'disease', 'control']):
                return "Integrated pest management is essential. Monitor your crops regularly and consider preventive measures based on your zone's environmental conditions."
            
            elif any(word in user_message for word in ['weather', 'climate', 'temperature']):
                return "Weather conditions significantly impact crop growth. Monitor local forecasts and adjust your farming practices accordingly."
            
            elif any(word in user_message for word in ['crop', 'plant', 'harvest']):
                return "Crop selection should be based on your zone's soil conditions, climate, and market demand. Consider crop rotation for sustainable farming."
            
            else:
                return "I'm here to help with your agricultural questions. Please ask me about crops, soil, weather, farming practices, or any other farming-related topics. I'm currently operating in fallback mode, but I can still provide basic agricultural guidance based on your zone's data."
                
        except Exception as e:
            logger.error(f"Error generating fallback response: {str(e)}")
            return "I'm experiencing technical difficulties right now. Please try asking your agricultural question again, or contact support if the issue persists."
    
    def validate_agricultural_query(self, user_message: str) -> Dict:
        """Validate if a user query is agricultural-related"""
        try:
            agricultural_keywords = [
                # Core farming terms
                'crop', 'soil', 'water', 'fertilizer', 'pest', 'weather', 'harvest',
                'plant', 'seed', 'irrigation', 'drainage', 'nutrient', 'ph', 'npk',
                'farming', 'agriculture', 'farm', 'field', 'yield', 'disease',
                'weed', 'organic', 'sustainable', 'rotation', 'season', 'climate',
                
                # Crop management
                'planting', 'sowing', 'growing', 'cultivation', 'tillage', 'plough',
                'plow', 'spacing', 'density', 'pruning', 'thinning', 'transplanting',
                
                # Soil and nutrients
                'nitrogen', 'phosphorus', 'potassium', 'calcium', 'magnesium', 'sulfur',
                'micronutrients', 'organic matter', 'compost', 'manure', 'mulch',
                'soil type', 'texture', 'structure', 'porosity', 'drainage',
                
                # Water and irrigation
                'moisture', 'humidity', 'rainfall', 'drought', 'flood', 'watering',
                'sprinkler', 'drip', 'flood irrigation', 'scheduling', 'efficiency',
                
                # Pest and disease management
                'insect', 'fungus', 'bacteria', 'virus', 'nematode', 'mite',
                'pesticide', 'herbicide', 'fungicide', 'biological control', 'ipm',
                'resistance', 'tolerance', 'prevention', 'treatment',
                
                # Weather and climate
                'temperature', 'humidity', 'wind', 'frost', 'heat', 'cold',
                'forecast', 'seasonal', 'climate change', 'adaptation',
                
                # Equipment and technology
                'tractor', 'harvester', 'planter', 'sprayer', 'sensor', 'iot',
                'precision agriculture', 'automation', 'gps', 'drone',
                
                # Market and economics
                'price', 'market', 'demand', 'supply', 'export', 'import',
                'profit', 'cost', 'revenue', 'investment', 'loan',
                
                # Sustainability and environment
                'conservation', 'biodiversity', 'pollination', 'carbon', 'greenhouse',
                'renewable', 'energy', 'waste', 'recycling', 'ecosystem'
            ]
            
            user_message_lower = user_message.lower()
            agricultural_score = sum(1 for keyword in agricultural_keywords if keyword in user_message_lower)
            
            # Calculate relevance score (0-1)
            relevance_score = min(agricultural_score / 3, 1.0)
            
            # More lenient threshold for agricultural queries
            is_agricultural = relevance_score > 0.2
            
            # Check for common non-agricultural topics
            non_agricultural_keywords = [
                'president', 'politics', 'election', 'government', 'law', 'legal',
                'sports', 'entertainment', 'movie', 'music', 'celebrity', 'gossip',
                'technology', 'computer', 'software', 'programming', 'coding',
                'health', 'medical', 'doctor', 'hospital', 'medicine', 'treatment'
            ]
            
            has_non_agricultural = any(kw in user_message_lower for kw in non_agricultural_keywords)
            
            # If non-agricultural keywords are prominent, override the agricultural score
            if has_non_agricultural and agricultural_score < 2:
                is_agricultural = False
                relevance_score = 0.1
            
            return {
                'is_agricultural': is_agricultural,
                'relevance_score': relevance_score,
                'detected_keywords': [kw for kw in agricultural_keywords if kw in user_message_lower],
                'non_agricultural_keywords': [kw for kw in non_agricultural_keywords if kw in user_message_lower],
                'suggestion': self._get_agricultural_suggestion(user_message_lower) if not is_agricultural else None
            }
            
        except Exception as e:
            logger.error(f"Error validating agricultural query: {str(e)}")
            return {
                'is_agricultural': True,  # Default to allowing
                'relevance_score': 0.5,
                'detected_keywords': [],
                'non_agricultural_keywords': [],
                'suggestion': None
            }
    
    def _get_agricultural_suggestion(self, user_message: str) -> str:
        """Get suggestion for non-agricultural queries"""
        suggestions = [
            "I'm specialized in agricultural topics. Try asking about crops, soil, weather, or farming practices instead.",
            "This question is outside my agricultural expertise. I can help you with farming, crops, soil management, and related topics.",
            "I'm designed to assist with agricultural matters. Please ask me about farming, crops, or zone management.",
            "That's not an agricultural topic. I can help you with soil analysis, crop recommendations, weather considerations, and farming best practices."
        ]
        
        # Simple hash-based selection for variety
        hash_value = hash(user_message) % len(suggestions)
        return suggestions[hash_value]
    
    def test_connection(self) -> Dict:
        """Test Gemini AI service connection"""
        try:
            if not self.is_available():
                return {
                    'status': 'unavailable',
                    'error': 'API key not configured or service not initialized'
                }
            
            # Test with a simple prompt
            test_prompt = "Hello, I'm testing the connection. Please respond with 'Connection successful' if you can see this message."
            
            response = self.model.generate_content(test_prompt)
            
            if response.text and 'Connection successful' in response.text:
                return {
                    'status': 'connected',
                    'model': self.model_name,
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {
                    'status': 'error',
                    'error': 'Unexpected response format'
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            } 