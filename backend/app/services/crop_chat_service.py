import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from flask import current_app
from app.services.ai_client import AIClient
from app.services.prompt_service import PromptService
from app.services.internet_service import InternetService
from app.models import Zone, ZoneLandCondition, Recommendation, ChatThread, ChatMessage
from app import db

logger = logging.getLogger(__name__)

class CropChatService:
    """Specialized service for crop recommendation chat with enhanced agricultural context"""
    
    def __init__(self):
        self.ai_client = AIClient()
        self.prompt_service = PromptService()
        self.internet_service = InternetService()
    
    def chat_about_crop_recommendation(
        self, 
        recommendation_id: int, 
        user_message: str, 
        user_id: int,
        user_role: str
    ) -> Dict:
        """
        Chat about a specific crop recommendation with enhanced agricultural context
        
        Args:
            recommendation_id: ID of the crop recommendation
            user_message: User's question about the recommendation
            user_id: ID of the user asking the question
            user_role: Role of the user
            
        Returns:
            Dict containing AI response and metadata
        """
        try:
            # Get the recommendation
            recommendation = Recommendation.query.get(recommendation_id)
            if not recommendation:
                return {'error': 'Recommendation not found'}
            
            # Get zone information
            zone = Zone.query.get(recommendation.zone_id)
            if not zone:
                return {'error': 'Zone not found'}
            
            # Get latest land conditions
            latest_conditions = ZoneLandCondition.query.filter_by(zone_id=zone.id)\
                .order_by(ZoneLandCondition.read_from_iot_at.desc()).first()
            
            # Get recent recommendations for context
            recent_recommendations = Recommendation.query.filter_by(zone_id=zone.id)\
                .order_by(Recommendation.created_at.desc()).limit(5).all()
            
            # Get conversation history
            conversation_history = self._get_conversation_history(recommendation_id, user_id)
            
            # Build enhanced context
            context = self._build_crop_chat_context(
                recommendation, zone, latest_conditions, 
                recent_recommendations, conversation_history, user_message, user_role
            )
            
            # Get agricultural context from internet
            agricultural_context = self.internet_service.get_zone_agricultural_context({
                'id': zone.id,
                'name': zone.name,
                'latitude': float(zone.latitude) if zone.latitude else None,
                'longitude': float(zone.longitude) if zone.longitude else None,
                'admin_region': zone.name
            })
            
            # Enhance context with internet data
            context.update(agricultural_context)
            
            # Get prompt template
            prompt_template = self._get_crop_chat_prompt_template()
            
            # Generate AI response
            ai_response = self.ai_client.chat_with_ai(context, prompt_template)
            
            # Save conversation
            thread_id = self._save_crop_chat_conversation(
                recommendation_id, user_id, user_message, ai_response
            )
            
            return {
                'reply': ai_response,
                'thread_id': thread_id,
                'recommendation_id': recommendation_id,
                'zone_id': zone.id,
                'zone_name': zone.name,
                'crops': recommendation.crops,
                'context_used': {
                    'soil_conditions': context.get('soil_conditions'),
                    'weather_data': context.get('weather_data'),
                    'recent_recommendations': len(recent_recommendations)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in crop recommendation chat: {str(e)}")
            return {'error': 'Failed to process crop chat message'}
    
    def chat_about_zone_crops(
        self, 
        zone_id: int, 
        user_message: str, 
        user_id: int,
        user_role: str
    ) -> Dict:
        """
        Chat about crops in a specific zone with comprehensive agricultural context
        
        Args:
            zone_id: ID of the zone
            user_message: User's agricultural question
            user_id: ID of the user asking the question
            user_role: Role of the user
            
        Returns:
            Dict containing AI response and metadata
        """
        try:
            # Get zone information
            zone = Zone.query.get(zone_id)
            if not zone:
                return {'error': 'Zone not found'}
            
            # Get latest land conditions
            latest_conditions = ZoneLandCondition.query.filter_by(zone_id=zone_id)\
                .order_by(ZoneLandCondition.read_from_iot_at.desc()).first()
            
            # Get recent recommendations
            recent_recommendations = Recommendation.query.filter_by(zone_id=zone_id)\
                .order_by(Recommendation.created_at.desc()).limit(5).all()
            
            # Get conversation history
            conversation_history = self._get_zone_chat_history(zone_id, user_id)
            
            # Build enhanced context
            context = self._build_zone_crop_context(
                zone, latest_conditions, recent_recommendations, 
                conversation_history, user_message, user_role
            )
            
            # Get agricultural context from internet
            agricultural_context = self.internet_service.get_zone_agricultural_context({
                'id': zone.id,
                'name': zone.name,
                'latitude': float(zone.latitude) if zone.latitude else None,
                'longitude': float(zone.longitude) if zone.longitude else None,
                'admin_region': zone.name
            })
            
            # Enhance context with internet data
            context.update(agricultural_context)
            
            # Get prompt template
            prompt_template = self._get_zone_crop_prompt_template()
            
            # Generate AI response
            ai_response = self.ai_client.chat_with_ai(context, prompt_template)
            
            # Save conversation
            thread_id = self._save_zone_chat_conversation(
                zone_id, user_id, user_message, ai_response
            )
            
            return {
                'reply': ai_response,
                'thread_id': thread_id,
                'zone_id': zone.id,
                'zone_name': zone.name,
                'recent_crops': [rec.crops for rec in recent_recommendations if rec.crops],
                'context_used': {
                    'soil_conditions': context.get('soil_conditions'),
                    'weather_data': context.get('weather_data'),
                    'recent_recommendations': len(recent_recommendations)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in zone crop chat: {str(e)}")
            return {'error': 'Failed to process zone crop chat message'}
    
    def _build_crop_chat_context(
        self, 
        recommendation: Recommendation, 
        zone: Zone, 
        latest_conditions: ZoneLandCondition,
        recent_recommendations: List[Recommendation],
        conversation_history: List[Dict],
        user_message: str,
        user_role: str
    ) -> Dict:
        """Build comprehensive context for crop recommendation chat"""
        try:
            # Extract crop data
            crops_data = recommendation.crops or []
            data_used = recommendation.data_used or {}
            
            # Build soil conditions
            soil_conditions = {}
            if latest_conditions:
                soil_conditions = {
                    'ph': latest_conditions.ph,
                    'nitrogen': latest_conditions.nitrogen,
                    'phosphorus': latest_conditions.phosphorus,
                    'potassium': latest_conditions.potassium,
                    'moisture': latest_conditions.soil_moisture,
                    'temperature': latest_conditions.temperature,
                    'humidity': latest_conditions.humidity,
                    'rainfall': latest_conditions.rainfall,
                    'soil_type': latest_conditions.soil_type,
                    'wind_speed': latest_conditions.wind_speed,
                    'pressure': latest_conditions.pressure
                }
            
            # Build recent recommendations context
            recent_crops_context = []
            for rec in recent_recommendations:
                if rec.crops:
                    recent_crops_context.append({
                        'id': rec.id,
                        'crops': rec.crops,
                        'status': rec.status.value,
                        'created_at': rec.created_at.isoformat() if rec.created_at else None,
                        'confidence': rec.confidence_score
                    })
            
            # Build seasonal context
            current_month = datetime.utcnow().month
            season = self._get_current_season(current_month)
            
            # Build crop-specific context
            crop_context = {}
            if crops_data:
                for crop in crops_data:
                    if isinstance(crop, dict):
                        crop_name = crop.get('crop', crop.get('name', 'Unknown'))
                        confidence = crop.get('confidence', crop.get('score', 0))
                    else:
                        crop_name = str(crop)
                        confidence = 0.8
                    
                    crop_context[crop_name] = {
                        'confidence': confidence,
                        'current_status': 'recommended',
                        'suitable_conditions': self._get_crop_suitable_conditions(crop_name, soil_conditions),
                        'management_notes': self._get_crop_management_notes(crop_name, season)
                    }
            
            context = {
                'zone_id': zone.id,
                'zone_name': zone.name,
                'zone_type': zone.zone_type or 'Agricultural',
                'area_hectare': float(zone.area_hectare) if zone.area_hectare else None,
                'latitude': float(zone.latitude) if zone.latitude else None,
                'longitude': float(zone.longitude) if zone.longitude else None,
                'admin_region': zone.name,
                
                'user_message': user_message,
                'user_role': user_role,
                'conversation_history': conversation_history,
                
                'soil_conditions': soil_conditions,
                'sensor_data': data_used,
                'crop_recommendations': crops_data,
                'data_used': data_used,
                'crop_context': crop_context,
                
                'recent_recommendations': recent_crops_context,
                'current_recommendation': {
                    'id': recommendation.id,
                    'crops': crops_data,
                    'status': recommendation.status.value,
                    'created_at': recommendation.created_at.isoformat() if recommendation.created_at else None,
                    'confidence': recommendation.confidence_score
                },
                
                'seasonal_factors': {
                    'current_season': season,
                    'current_month': current_month,
                    'planting_season': season in ['Spring', 'Summer'],
                    'harvest_season': season in ['Autumn', 'Summer'],
                    'optimal_planting_months': self._get_optimal_planting_months(crops_data),
                    'harvest_timing': self._get_harvest_timing(crops_data, season)
                },
                
                'environmental_quality': self._assess_environmental_quality(soil_conditions, data_used),
                'risk_factors': self._identify_risk_factors(soil_conditions, season, crops_data)
            }
            
            return context
            
        except Exception as e:
            logger.error(f"Error building crop chat context: {str(e)}")
            return {}
    
    def _build_zone_crop_context(
        self, 
        zone: Zone, 
        latest_conditions: ZoneLandCondition,
        recent_recommendations: List[Recommendation],
        conversation_history: List[Dict],
        user_message: str,
        user_role: str
    ) -> Dict:
        """Build comprehensive context for zone crop chat"""
        try:
            # Build soil conditions
            soil_conditions = {}
            if latest_conditions:
                soil_conditions = {
                    'ph': latest_conditions.ph,
                    'nitrogen': latest_conditions.nitrogen,
                    'phosphorus': latest_conditions.phosphorus,
                    'potassium': latest_conditions.potassium,
                    'moisture': latest_conditions.soil_moisture,
                    'temperature': latest_conditions.temperature,
                    'humidity': latest_conditions.humidity,
                    'rainfall': latest_conditions.rainfall
                }
            
            # Build recent recommendations context
            recent_crops_context = []
            for rec in recent_recommendations:
                if rec.crops:
                    recent_crops_context.append({
                        'id': rec.id,
                        'crops': rec.crops,
                        'status': rec.status.value,
                        'created_at': rec.created_at.isoformat() if rec.created_at else None,
                        'confidence': rec.confidence_score
                    })
            
            # Build seasonal context
            current_month = datetime.utcnow().month
            season = self._get_current_season(current_month)
            
            context = {
                'zone_id': zone.id,
                'zone_name': zone.name,
                'zone_type': zone.zone_type or 'Agricultural',
                'area_hectare': float(zone.area_hectare) if zone.area_hectare else None,
                'latitude': float(zone.latitude) if zone.latitude else None,
                'longitude': float(zone.longitude) if zone.longitude else None,
                'admin_region': zone.name,
                
                'user_message': user_message,
                'user_role': user_role,
                'conversation_history': conversation_history,
                
                'soil_conditions': soil_conditions,
                'recent_recommendations': recent_crops_context,
                
                'seasonal_factors': {
                    'current_season': season,
                    'current_month': current_month,
                    'planting_season': season in ['Spring', 'Summer'],
                    'harvest_season': season in ['Autumn', 'Summer']
                }
            }
            
            return context
            
        except Exception as e:
            logger.error(f"Error building zone crop context: {str(e)}")
            return {}
    
    def _get_conversation_history(self, recommendation_id: int, user_id: int) -> List[Dict]:
        """Get conversation history for a specific recommendation"""
        try:
            thread = ChatThread.query.filter_by(
                recommendation_id=recommendation_id,
                user_id=user_id
            ).first()
            
            if not thread:
                return []
            
            messages = ChatMessage.query.filter_by(thread_id=thread.id)\
                .order_by(ChatMessage.created_at.desc()).limit(10).all()
            
            history = []
            for msg in reversed(messages):  # Get chronological order
                history.append({
                    'role': msg.role,
                    'message_text': msg.message_text,
                    'created_at': msg.created_at.isoformat() if msg.created_at else None
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}")
            return []
    
    def _get_zone_chat_history(self, zone_id: int, user_id: int) -> List[Dict]:
        """Get zone chat history"""
        try:
            # Get zone chat messages
            zone_messages = ChatMessage.query.join(ChatThread)\
                .filter(ChatMessage.metadata.contains({'zone_id': zone_id, 'chat_type': 'zone_chat'}))\
                .order_by(ChatMessage.created_at.desc()).limit(10).all()
            
            history = []
            for msg in reversed(zone_messages):  # Get chronological order
                history.append({
                    'role': msg.role,
                    'message_text': msg.message_text,
                    'created_at': msg.created_at.isoformat() if msg.created_at else None
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting zone chat history: {str(e)}")
            return []
    
    def _save_crop_chat_conversation(
        self, 
        recommendation_id: int, 
        user_id: int, 
        user_message: str, 
        ai_response: str
    ) -> int:
        """Save crop chat conversation to database"""
        try:
            # Get or create chat thread
            thread = ChatThread.query.filter_by(
                recommendation_id=recommendation_id,
                user_id=user_id
            ).first()
            
            if not thread:
                thread = ChatThread(
                    recommendation_id=recommendation_id,
                    user_id=user_id
                )
                db.session.add(thread)
                db.session.commit()
            
            # Save user message
            user_msg = ChatMessage(
                thread_id=thread.id,
                role='user',
                message_text=user_message,
                metadata={'chat_type': 'crop_recommendation_chat'}
            )
            db.session.add(user_msg)
            
            # Save AI response
            assistant_msg = ChatMessage(
                thread_id=thread.id,
                role='assistant',
                message_text=ai_response,
                metadata={'chat_type': 'crop_recommendation_chat'}
            )
            db.session.add(assistant_msg)
            
            db.session.commit()
            return thread.id
            
        except Exception as e:
            logger.error(f"Error saving crop chat conversation: {str(e)}")
            db.session.rollback()
            return None
    
    def _save_zone_chat_conversation(
        self, 
        zone_id: int, 
        user_id: int, 
        user_message: str, 
        ai_response: str
    ) -> int:
        """Save zone chat conversation to database"""
        try:
            # Get or create chat thread for zone-level chat
            thread = ChatThread.query.filter_by(
                recommendation_id=None,
                user_id=user_id
            ).first()
            
            if not thread:
                thread = ChatThread(
                    recommendation_id=None,
                    user_id=user_id
                )
                db.session.add(thread)
                db.session.commit()
            
            # Save user message
            user_msg = ChatMessage(
                thread_id=thread.id,
                role='user',
                message_text=user_message,
                metadata={'zone_id': zone_id, 'chat_type': 'zone_crop_chat'}
            )
            db.session.add(user_msg)
            
            # Save AI response
            assistant_msg = ChatMessage(
                thread_id=thread.id,
                role='assistant',
                message_text=ai_response,
                metadata={'zone_id': zone_id, 'chat_type': 'zone_crop_chat'}
            )
            db.session.add(assistant_msg)
            
            db.session.commit()
            return thread.id
            
        except Exception as e:
            logger.error(f"Error saving zone chat conversation: {str(e)}")
            db.session.rollback()
            return None
    
    def _get_crop_chat_prompt_template(self) -> Dict:
        """Get prompt template for crop recommendation chat"""
        try:
            # Try to get the enhanced crop chat template first
            template = self.prompt_service.get_template_by_name('zone_admin_crop_chat_enhanced')
            if template:
                return template
            
            # Fallback to the standard crop chat template
            template = self.prompt_service.get_template_by_name('zone_admin_crop_chat')
            if template:
                return template
            
            # Final fallback to default template
            return None
            
        except Exception as e:
            logger.warning(f"Could not get crop chat prompt template: {str(e)}")
            return None
    
    def _get_zone_crop_prompt_template(self) -> Dict:
        """Get prompt template for zone crop chat"""
        try:
            # Try to get the enhanced crop chat template first
            template = self.prompt_service.get_template_by_name('zone_admin_crop_chat_enhanced')
            if template:
                return template
            
            # Fallback to the advanced zone admin template
            template = self.prompt_service.get_template_by_name('zone_admin_chat_advanced')
            if template:
                return template
            
            # Final fallback to default template
            return None
            
        except Exception as e:
            logger.warning(f"Could not get zone crop prompt template: {str(e)}")
            return None
    
    def _get_current_season(self, month: int) -> str:
        """Get current season based on month"""
        if month in [12, 1, 2]:
            return 'Winter'
        elif month in [3, 4, 5]:
            return 'Spring'
        elif month in [6, 7, 8]:
            return 'Summer'
        else:
            return 'Autumn'
    
    def _get_crop_suitable_conditions(self, crop_name: str, soil_conditions: dict) -> dict:
        """Get suitable conditions for a specific crop"""
        try:
            # This would integrate with crop database in a real implementation
            crop_requirements = {
                'rice': {
                    'optimal_ph': (5.5, 6.5),
                    'optimal_temperature': (20, 35),
                    'water_requirement': 'high',
                    'soil_type': 'clay_loam'
                },
                'wheat': {
                    'optimal_ph': (6.0, 7.5),
                    'optimal_temperature': (15, 25),
                    'water_requirement': 'moderate',
                    'soil_type': 'loam'
                },
                'maize': {
                    'optimal_ph': (5.5, 7.5),
                    'optimal_temperature': (18, 32),
                    'water_requirement': 'moderate',
                    'soil_type': 'loam'
                },
                'cotton': {
                    'optimal_ph': (5.5, 8.5),
                    'optimal_temperature': (20, 35),
                    'water_requirement': 'moderate',
                    'soil_type': 'loam'
                }
            }
            
            return crop_requirements.get(crop_name.lower(), {
                'optimal_ph': (6.0, 7.0),
                'optimal_temperature': (20, 30),
                'water_requirement': 'moderate',
                'soil_type': 'loam'
            })
            
        except Exception as e:
            logger.error(f"Error getting crop suitable conditions: {str(e)}")
            return {}
    
    def _get_crop_management_notes(self, crop_name: str, season: str) -> list:
        """Get management notes for a specific crop in the current season"""
        try:
            management_notes = {
                'rice': {
                    'Spring': ['Prepare seedbed', 'Ensure proper water level', 'Monitor for pests'],
                    'Summer': ['Maintain water level', 'Apply fertilizers', 'Control weeds'],
                    'Autumn': ['Harvest preparation', 'Reduce water gradually', 'Monitor maturity'],
                    'Winter': ['Store harvested rice', 'Prepare for next season', 'Maintain equipment']
                },
                'wheat': {
                    'Spring': ['Monitor growth', 'Apply nitrogen fertilizer', 'Control diseases'],
                    'Summer': ['Harvest preparation', 'Monitor moisture', 'Control pests'],
                    'Autumn': ['Planting season', 'Prepare soil', 'Apply base fertilizer'],
                    'Winter': ['Monitor winter hardiness', 'Protect from frost', 'Check for diseases']
                }
            }
            
            return management_notes.get(crop_name.lower(), {}).get(season, [
                'Monitor crop health regularly',
                'Maintain optimal growing conditions',
                'Follow recommended practices for the season'
            ])
            
        except Exception as e:
            logger.error(f"Error getting crop management notes: {str(e)}")
            return ['Monitor crop health regularly']
    
    def _get_optimal_planting_months(self, crops_data: list) -> dict:
        """Get optimal planting months for recommended crops"""
        try:
            optimal_months = {
                'rice': [3, 4, 5, 6],  # Spring to early summer
                'wheat': [10, 11, 12],  # Autumn to early winter
                'maize': [3, 4, 5],     # Spring
                'cotton': [4, 5, 6]     # Spring to early summer
            }
            
            result = {}
            for crop in crops_data:
                if isinstance(crop, dict):
                    crop_name = crop.get('crop', crop.get('name', 'Unknown'))
                else:
                    crop_name = str(crop)
                
                result[crop_name] = optimal_months.get(crop_name.lower(), [3, 4, 5])
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting optimal planting months: {str(e)}")
            return {}
    
    def _get_harvest_timing(self, crops_data: list, current_season: str) -> dict:
        """Get harvest timing for recommended crops"""
        try:
            harvest_timing = {
                'rice': 'Autumn (September-October)',
                'wheat': 'Summer (May-June)',
                'maize': 'Autumn (September-October)',
                'cotton': 'Autumn (October-November)'
            }
            
            result = {}
            for crop in crops_data:
                if isinstance(crop, dict):
                    crop_name = crop.get('crop', crop.get('name', 'Unknown'))
                else:
                    crop_name = str(crop)
                
                result[crop_name] = harvest_timing.get(crop_name.lower(), 'Varies by variety')
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting harvest timing: {str(e)}")
            return {}
    
    def _assess_environmental_quality(self, soil_conditions: dict, data_used: dict) -> dict:
        """Assess the quality of environmental conditions"""
        try:
            quality_score = 0
            max_score = 100
            issues = []
            recommendations = []
            
            # Assess pH
            if soil_conditions.get('ph'):
                ph = soil_conditions['ph']
                if 6.0 <= ph <= 7.5:
                    quality_score += 20
                elif 5.5 <= ph <= 8.0:
                    quality_score += 15
                else:
                    quality_score += 5
                    issues.append(f"pH level ({ph}) is outside optimal range (6.0-7.5)")
                    recommendations.append("Consider soil amendments to adjust pH")
            
            # Assess nutrients
            nutrients = ['nitrogen', 'phosphorus', 'potassium']
            for nutrient in nutrients:
                if soil_conditions.get(nutrient):
                    value = soil_conditions[nutrient]
                    if 40 <= value <= 80:
                        quality_score += 15
                    elif 20 <= value <= 100:
                        quality_score += 10
                    else:
                        quality_score += 5
                        issues.append(f"{nutrient.capitalize()} level ({value}) may need adjustment")
                        recommendations.append(f"Consider {nutrient} fertilizer application")
            
            # Assess moisture
            if soil_conditions.get('moisture'):
                moisture = soil_conditions['moisture']
                if 20 <= moisture <= 40:
                    quality_score += 15
                elif 15 <= moisture <= 50:
                    quality_score += 10
                else:
                    quality_score += 5
                    issues.append(f"Soil moisture ({moisture}%) may need adjustment")
                    recommendations.append("Adjust irrigation schedule")
            
            return {
                'overall_score': min(quality_score, max_score),
                'max_score': max_score,
                'grade': self._get_quality_grade(quality_score),
                'issues': issues,
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Error assessing environmental quality: {str(e)}")
            return {'overall_score': 50, 'grade': 'C', 'issues': [], 'recommendations': []}
    
    def _get_quality_grade(self, score: int) -> str:
        """Convert quality score to letter grade"""
        if score >= 90:
            return 'A+'
        elif score >= 80:
            return 'A'
        elif score >= 70:
            return 'B+'
        elif score >= 60:
            return 'B'
        elif score >= 50:
            return 'C'
        elif score >= 40:
            return 'D'
        else:
            return 'F'
    
    def _identify_risk_factors(self, soil_conditions: dict, season: str, crops_data: list) -> dict:
        """Identify potential risk factors for the zone"""
        try:
            risks = []
            mitigations = []
            
            # pH risks
            if soil_conditions.get('ph'):
                ph = soil_conditions['ph']
                if ph < 5.5:
                    risks.append("Acidic soil may limit crop growth")
                    mitigations.append("Apply lime to raise pH")
                elif ph > 8.5:
                    risks.append("Alkaline soil may cause nutrient deficiencies")
                    mitigations.append("Apply sulfur or organic matter to lower pH")
            
            # Nutrient risks
            if soil_conditions.get('nitrogen', 0) < 30:
                risks.append("Low nitrogen may reduce crop yield")
                mitigations.append("Apply nitrogen fertilizer")
            
            if soil_conditions.get('phosphorus', 0) < 20:
                risks.append("Low phosphorus may affect root development")
                mitigations.append("Apply phosphorus fertilizer")
            
            # Seasonal risks
            if season == 'Winter' and any('rice' in str(crop).lower() for crop in crops_data):
                risks.append("Winter conditions may affect rice growth")
                mitigations.append("Ensure proper winter protection")
            
            if season == 'Summer' and any('wheat' in str(crop).lower() for crop in crops_data):
                risks.append("Summer heat may stress wheat plants")
                mitigations.append("Ensure adequate irrigation and shading")
            
            return {
                'risks': risks,
                'mitigations': mitigations,
                'risk_level': 'High' if len(risks) > 3 else 'Medium' if len(risks) > 1 else 'Low'
            }
            
        except Exception as e:
            logger.error(f"Error identifying risk factors: {str(e)}")
            return {'risks': [], 'mitigations': [], 'risk_level': 'Unknown'} 