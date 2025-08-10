import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
import json

from ..models import db, Recommendation, Zone, SensorData, WeatherData, User
from .ai_client import AIClient
from .weather_service import WeatherService
from .iot_service import IoTService

logger = logging.getLogger(__name__)

class RecommendationService:
    """Service for managing crop recommendations"""
    
    def __init__(self):
        self.ai_client = AIClient()
        self.weather_service = WeatherService()
        self.iot_service = IoTService()
    
    def generate_recommendation_from_zone(self, zone_id: int, user_id: int, 
                                        start_date: Optional[datetime] = None, 
                                        end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Generate crop recommendation for a specific zone using historical data
        
        Args:
            zone_id: ID of the zone
            user_id: ID of the user requesting the recommendation
            start_date: Start date for data aggregation (defaults to 7 days ago)
            end_date: End date for data aggregation (defaults to now)
            
        Returns:
            Dict containing the recommendation data
        """
        try:
            # Set default dates if not provided
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=7)
            
            # Get zone information
            zone = Zone.query.get(zone_id)
            if not zone:
                raise ValueError(f"Zone {zone_id} not found")
            
            # Get aggregated sensor data for the zone
            aggregated_data = self._get_aggregated_zone_data(zone_id, start_date, end_date)
            
            # Get weather data for the zone
            weather_data = self._get_zone_weather_data(zone_id, start_date, end_date)
            
            # Generate recommendation using AI
            ai_result = self.ai_client.generate_crop_recommendation(
                sensor_data=aggregated_data,
                weather_data=weather_data,
                zone_info={
                    'zone_id': zone_id,
                    'zone_name': zone.name,
                    'zone_type': zone.zone_type,
                    'area': zone.area,
                    'location': zone.location
                }
            )
            
            # Create recommendation record
            recommendation = Recommendation(
                zone_id=zone_id,
                user_id=user_id,
                recommendation_data=ai_result,
                generated_at=datetime.utcnow(),
                data_start_date=start_date,
                data_end_date=end_date,
                ai_model_version='v2.0',
                confidence_score=ai_result.get('confidence', 0.0)
            )
            
            db.session.add(recommendation)
            db.session.commit()
            
            logger.info(f"Generated recommendation for zone {zone_id} with confidence {ai_result.get('confidence', 0.0)}")
            
            return {
                'recommendation_id': recommendation.id,
                'zone_id': zone_id,
                'zone_name': zone.name,
                'generated_at': recommendation.generated_at.isoformat(),
                'ai_result': ai_result,
                'data_quality': ai_result.get('data_quality', {}),
                'confidence': ai_result.get('confidence', 0.0)
            }
            
        except Exception as e:
            logger.error(f"Error generating recommendation for zone {zone_id}: {str(e)}")
            db.session.rollback()
            raise
    
    def generate_recommendation_from_sensors(self, sensor_data: Dict[str, Any], 
                                           weather_data: Optional[Dict[str, Any]] = None,
                                           zone_info: Optional[Dict[str, Any]] = None,
                                           user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Generate crop recommendation directly from sensor data and weather data
        
        Args:
            sensor_data: IoT sensor readings
            weather_data: Optional weather information
            zone_info: Optional zone information
            user_id: Optional user ID for storing the recommendation
            
        Returns:
            Dict containing the recommendation data
        """
        try:
            # Generate recommendation using AI
            ai_result = self.ai_client.generate_crop_recommendation(
                sensor_data=sensor_data,
                weather_data=weather_data,
                zone_info=zone_info
            )
            
            # Store recommendation if user_id is provided
            if user_id and zone_info and zone_info.get('zone_id'):
                recommendation = Recommendation(
                    zone_id=zone_info['zone_id'],
                    user_id=user_id,
                    recommendation_data=ai_result,
                    generated_at=datetime.utcnow(),
                    data_start_date=datetime.utcnow(),
                    data_end_date=datetime.utcnow(),
                    ai_model_version='v2.0',
                    confidence_score=ai_result.get('confidence', 0.0)
                )
                
                db.session.add(recommendation)
                db.session.commit()
                
                ai_result['recommendation_id'] = recommendation.id
            
            logger.info(f"Generated direct recommendation with confidence {ai_result.get('confidence', 0.0)}")
            
            return ai_result
            
        except Exception as e:
            logger.error(f"Error generating direct recommendation: {str(e)}")
            if user_id and zone_info and zone_info.get('zone_id'):
                db.session.rollback()
            raise
    
    def get_recommendation_history(self, zone_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recommendation history for a zone"""
        try:
            recommendations = Recommendation.query.filter_by(zone_id=zone_id)\
                .order_by(desc(Recommendation.generated_at))\
                .limit(limit)\
                .all()
            
            return [{
                'id': rec.id,
                'generated_at': rec.generated_at.isoformat(),
                'confidence_score': rec.confidence_score,
                'ai_model_version': rec.ai_model_version,
                'top_crop': rec.recommendation_data.get('crops', [{}])[0].get('crop_name', 'Unknown'),
                'top_score': rec.recommendation_data.get('crops', [{}])[0].get('suitability_score', 0)
            } for rec in recommendations]
            
        except Exception as e:
            logger.error(f"Error getting recommendation history for zone {zone_id}: {str(e)}")
            return []
    
    def get_user_recommendations(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Get all recommendations for a user across all zones"""
        try:
            recommendations = Recommendation.query.filter_by(user_id=user_id)\
                .order_by(desc(Recommendation.generated_at))\
                .limit(limit)\
                .all()
            
            result = []
            for rec in recommendations:
                zone = Zone.query.get(rec.zone_id)
                zone_name = zone.name if zone else f"Zone {rec.zone_id}"
                
                result.append({
                    'id': rec.id,
                    'zone_id': rec.zone_id,
                    'zone_name': zone_name,
                    'generated_at': rec.generated_at.isoformat(),
                    'confidence_score': rec.confidence_score,
                    'ai_model_version': rec.ai_model_version,
                    'top_crop': rec.recommendation_data.get('crops', [{}])[0].get('crop_name', 'Unknown'),
                    'top_score': rec.recommendation_data.get('crops', [{}])[0].get('suitability_score', 0),
                    'soil_type': rec.recommendation_data.get('soil_type', 'Unknown'),
                    'data_quality': rec.recommendation_data.get('data_quality', {})
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting user recommendations for user {user_id}: {str(e)}")
            return []
    
    def get_recommendation_details(self, recommendation_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific recommendation"""
        try:
            recommendation = Recommendation.query.get(recommendation_id)
            if not recommendation:
                return None
            
            zone = Zone.query.get(recommendation.zone_id)
            zone_name = zone.name if zone else f"Zone {recommendation.zone_id}"
            
            return {
                'id': recommendation.id,
                'zone_id': recommendation.zone_id,
                'zone_name': zone_name,
                'user_id': recommendation.user_id,
                'generated_at': recommendation.generated_at.isoformat(),
                'data_start_date': recommendation.data_start_date.isoformat() if recommendation.data_start_date else None,
                'data_end_date': recommendation.data_end_date.isoformat() if recommendation.data_end_date else None,
                'ai_model_version': recommendation.ai_model_version,
                'confidence_score': recommendation.confidence_score,
                'recommendation_data': recommendation.recommendation_data
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendation details for {recommendation_id}: {str(e)}")
            return None
    
    def _get_aggregated_zone_data(self, zone_id: int, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get aggregated sensor data for a zone within a date range"""
        try:
            # Get all sensor data for the zone in the date range
            sensor_data = SensorData.query.filter(
                and_(
                    SensorData.zone_id == zone_id,
                    SensorData.timestamp >= start_date,
                    SensorData.timestamp <= end_date
                )
            ).all()
            
            if not sensor_data:
                # Return default values if no sensor data
                return {
                    'nitrogen': 50.0,
                    'phosphorus': 50.0,
                    'potassium': 50.0,
                    'ph': 6.5,
                    'soil_moisture': 30.0,
                    'temperature': 25.0,
                    'humidity': 70.0,
                    'rainfall': 100.0
                }
            
            # Aggregate the data (use averages for now, could be enhanced with more sophisticated methods)
            aggregated = {
                'nitrogen': 0.0,
                'phosphorus': 0.0,
                'potassium': 0.0,
                'ph': 0.0,
                'soil_moisture': 0.0,
                'temperature': 0.0,
                'humidity': 0.0,
                'rainfall': 0.0
            }
            
            count = len(sensor_data)
            for data in sensor_data:
                if data.nitrogen is not None:
                    aggregated['nitrogen'] += data.nitrogen
                if data.phosphorus is not None:
                    aggregated['phosphorus'] += data.phosphorus
                if data.potassium is not None:
                    aggregated['potassium'] += data.potassium
                if data.ph is not None:
                    aggregated['ph'] += data.ph
                if data.soil_moisture is not None:
                    aggregated['soil_moisture'] += data.soil_moisture
                if data.temperature is not None:
                    aggregated['temperature'] += data.temperature
                if data.humidity is not None:
                    aggregated['humidity'] += data.humidity
                if data.rainfall is not None:
                    aggregated['rainfall'] += data.rainfall
            
            # Calculate averages
            for key in aggregated:
                if count > 0:
                    aggregated[key] = round(aggregated[key] / count, 2)
            
            return aggregated
                
        except Exception as e:
            logger.error(f"Error aggregating zone data: {str(e)}")
            # Return default values on error
            return {
                'nitrogen': 50.0,
                'phosphorus': 50.0,
                'potassium': 50.0,
                'ph': 6.5,
                'soil_moisture': 30.0,
                'temperature': 25.0,
                'humidity': 70.0,
                'rainfall': 100.0
            }
    
    def _get_zone_weather_data(self, zone_id: int, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get weather data for a zone within a date range"""
        try:
            # Get weather data for the zone in the date range
            weather_data = WeatherData.query.filter(
                and_(
                    WeatherData.zone_id == zone_id,
                    WeatherData.timestamp >= start_date,
                    WeatherData.timestamp <= end_date
                )
            ).all()
            
            if not weather_data:
                return {}
            
            # Aggregate weather data (use most recent values for current conditions)
            latest_weather = max(weather_data, key=lambda x: x.timestamp)
            
            return {
                'temperature': latest_weather.temperature,
                'humidity': latest_weather.humidity,
                'rainfall': latest_weather.rainfall,
                'wind_speed': latest_weather.wind_speed,
                'pressure': latest_weather.pressure,
                'description': latest_weather.description,
                'timestamp': latest_weather.timestamp.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting zone weather data: {str(e)}")
            return {}
    
    def get_ai_service_status(self) -> Dict[str, Any]:
        """Get the status of the AI service"""
        try:
            is_connected = self.ai_client.test_connection()
            
            return {
                'status': 'connected' if is_connected else 'disconnected',
                'ai_mode': self.ai_client.ai_mode,
                'model_loaded': self.ai_client.model is not None if hasattr(self.ai_client, 'model') else False,
                'last_test': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error checking AI service status: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'last_test': datetime.utcnow().isoformat()
            }
    
    def cleanup_old_recommendations(self, days_to_keep: int = 90) -> int:
        """Clean up old recommendations to save storage space"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            # Count recommendations to be deleted
            count = Recommendation.query.filter(
                Recommendation.generated_at < cutoff_date
        ).count()
        
            # Delete old recommendations
            Recommendation.query.filter(
                Recommendation.generated_at < cutoff_date
            ).delete()
            
            db.session.commit()
            
            logger.info(f"Cleaned up {count} old recommendations")
            return count
            
        except Exception as e:
            logger.error(f"Error cleaning up old recommendations: {str(e)}")
            db.session.rollback()
            return 0 