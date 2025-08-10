from flask import Blueprint, request, jsonify, current_app
from flask.views import MethodView
# from flask_login import login_required, current_user
from datetime import datetime, timedelta
import logging
from typing import Dict, Any, Optional
from flask_smorest import Blueprint as SmorestBlueprint, abort
from marshmallow import Schema, fields, validate

from ..services.recommendation_service import RecommendationService
from ..services.weather_service import WeatherService
from ..services.iot_service import IoTService
from ..models import db, Zone, User, Recommendation
from ..utils import require_role, require_zone_access

logger = logging.getLogger(__name__)

# Create Flask-Smorest blueprint for Swagger documentation
blp = SmorestBlueprint('recommendations_api', __name__, description='Crop recommendation operations')

# Create regular blueprint for routing
recommendations_bp = Blueprint('recommendations', __name__)

# Schemas for request/response validation
class GenerateRecommendationSchema(Schema):
    zone_id = fields.Integer(required=True, description="ID of the zone for recommendation")
    start_date = fields.String(description="Start date in ISO 8601 format (optional)")
    end_date = fields.String(description="End date in ISO 8601 format (optional)")

class DirectRecommendationSchema(Schema):
    sensor_data = fields.Dict(required=True, description="IoT sensor readings")
    weather_data = fields.Dict(description="Weather information (optional)")
    zone_info = fields.Dict(description="Zone information (optional)")

class RecommendationResponseSchema(Schema):
    success = fields.Boolean(description="Operation success status")
    message = fields.String(description="Response message")
    data = fields.Dict(description="Recommendation data")

class RecommendationHistorySchema(Schema):
    success = fields.Boolean(description="Operation success status")
    data = fields.Dict(description="History data")

class IoTDataIngestionSchema(Schema):
    zone_id = fields.Integer(required=True, description="Zone ID for the sensor data")
    sensor_data = fields.Dict(required=True, description="Sensor readings from IoT devices")

class CleanupSchema(Schema):
    days_to_keep = fields.Integer(validate=validate.Range(min=1), description="Number of days to keep recommendations")

@blp.route('/generate')
class GenerateRecommendation(MethodView):
    @blp.arguments(GenerateRecommendationSchema)
    @blp.response(200, RecommendationResponseSchema)
    @blp.doc(description="Generate crop recommendation for a zone using historical data")
    def post(self, args):
        """Generate crop recommendation for a zone using historical data"""
        try:
            logger.info(f"Starting recommendation generation with args: {args}")
            
            zone_id = args['zone_id']
            start_date_str = args.get('start_date')
            end_date_str = args.get('end_date')
            
            logger.info(f"Processing zone_id: {zone_id}, start_date: {start_date_str}, end_date: {end_date_str}")
            
            # Parse dates if provided
            start_date = None
            end_date = None
            
            if start_date_str:
                try:
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    logger.info(f"Parsed start_date: {start_date}")
                except ValueError as e:
                    logger.error(f"Failed to parse start_date '{start_date_str}': {str(e)}")
                    abort(400, message='Invalid start_date format. Use ISO 8601 format')
            
            if end_date_str:
                try:
                    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    logger.info(f"Parsed end_date: {end_date}")
                except ValueError as e:
                    logger.error(f"Failed to parse end_date '{end_date_str}': {str(e)}")
                    abort(400, message='Invalid end_date format. Use ISO 8601 format')
            
            # Check if user has access to the zone
            logger.info(f"Looking up zone with ID: {zone_id}")
            zone = Zone.query.get(zone_id)
            if not zone:
                logger.error(f"Zone not found with ID: {zone_id}")
                abort(404, message='Zone not found')
            
            logger.info(f"Found zone: {zone.name} (ID: {zone.id})")
            
            # Check if zone has any land condition data
            from app.models import ZoneLandCondition
            land_condition_count = ZoneLandCondition.query.filter_by(zone_id=zone_id).count()
            logger.info(f"Zone {zone_id} has {land_condition_count} land condition records")
            
            recommendation_service = RecommendationService()
            logger.info("RecommendationService initialized successfully")
            
            logger.info(f"Calling generate_recommendation_from_zone with zone_id={zone_id}, user_id=1, start_date={start_date}, end_date={end_date}")
            
            result = recommendation_service.generate_recommendation_from_zone(
                zone_id=zone_id,
                user_id=1,
                start_date=start_date,
                end_date=end_date
            )
            
            logger.info(f"Recommendation generated successfully. Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
            
            return {
                'success': True,
                'message': 'Recommendation generated successfully',
                'data': result
            }
            
        except Exception as e:
            logger.error(f"Error generating recommendation: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception details: {str(e)}")
            
            # Log the full traceback for debugging
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            # Return more specific error information
            abort(500, message=f'Internal server error: {str(e)}')

@blp.route('/direct')
class DirectRecommendation(MethodView):
    @blp.arguments(DirectRecommendationSchema)
    @blp.response(200, RecommendationResponseSchema)
    @blp.doc(description="Generate crop recommendation directly from sensor data and weather data")
    def post(self, args):
        """Generate crop recommendation directly from sensor data and weather data"""
        try:
            sensor_data = args['sensor_data']
            weather_data = args.get('weather_data', {})
            zone_info = args.get('zone_info', {})
            
            # Validate required sensor data fields
            required_fields = ['nitrogen', 'phosphorus', 'potassium', 'ph', 'soil_moisture']
            missing_fields = [field for field in required_fields if field not in sensor_data or sensor_data[field] is None]
            
            if missing_fields:
                abort(400, message=f'Missing required sensor data fields: {missing_fields}')
            
            # Validate data types and ranges
            validation_errors = []
            
            # pH validation
            if 'ph' in sensor_data:
                try:
                    ph = float(sensor_data['ph'])
                    if not (3.0 <= ph <= 11.0):
                        validation_errors.append('pH must be between 3.0 and 11.0')
                except (ValueError, TypeError):
                    validation_errors.append('pH must be a valid number')
            
            # Soil moisture validation
            if 'soil_moisture' in sensor_data:
                try:
                    moisture = float(sensor_data['soil_moisture'])
                    if not (0 <= moisture <= 100):
                        validation_errors.append('Soil moisture must be between 0 and 100')
                except (ValueError, TypeError):
                    validation_errors.append('Soil moisture must be a valid number')
            
            # Nutrient validation
            for nutrient in ['nitrogen', 'phosphorus', 'potassium']:
                if nutrient in sensor_data:
                    try:
                        value = float(sensor_data[nutrient])
                        if value < 0:
                            validation_errors.append(f'{nutrient.capitalize()} must be non-negative')
                    except (ValueError, TypeError):
                        validation_errors.append(f'{nutrient.capitalize()} must be a valid number')
            
            if validation_errors:
                abort(400, message='Data validation failed', errors=validation_errors)
            
            recommendation_service = RecommendationService()
            
            # Generate recommendation
            result = recommendation_service.generate_recommendation_from_sensors(
                sensor_data=sensor_data,
                weather_data=weather_data,
                zone_info=zone_info,
                user_id=1 if zone_info and zone_info.get('zone_id') else None
            )
            
            return {
                'success': True,
                'message': 'Direct recommendation generated successfully',
                'data': result
            }
            
        except Exception as e:
            logger.error(f"Error generating direct recommendation: {str(e)}")
            abort(500, message='Internal server error')

@blp.route('/history/<int:zone_id>')
class RecommendationHistory(MethodView):
    @blp.response(200, RecommendationHistorySchema)
    @blp.doc(description="Get recommendation history for a specific zone")
    def get(self, zone_id):
        """Get recommendation history for a specific zone"""
        try:
            limit = request.args.get('limit', 10, type=int)
            if limit > 100:
                limit = 100
            
            recommendation_service = RecommendationService()
            history = recommendation_service.get_recommendation_history(zone_id, limit)
            
            return {
                'success': True,
                'data': {
                    'zone_id': zone_id,
                    'history': history,
                    'total': len(history)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendation history: {str(e)}")
            abort(500, message='Internal server error')

@blp.route('/user')
class UserRecommendations(MethodView):
    @blp.response(200, RecommendationHistorySchema)
    @blp.doc(description="Get all recommendations for the current user")
    def get(self):
        """Get all recommendations for the current user"""
        try:
            limit = request.args.get('limit', 20, type=int)
            if limit > 100:
                limit = 100
            
            recommendation_service = RecommendationService()
            recommendations = recommendation_service.get_user_recommendations(1, limit)
            
            return {
                'success': True,
                'data': {
                    'user_id': 1,
                    'recommendations': recommendations,
                    'total': len(recommendations)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting user recommendations: {str(e)}")
            abort(500, message='Internal server error')

@blp.route('/<int:recommendation_id>')
class RecommendationDetails(MethodView):
    @blp.response(200, RecommendationResponseSchema)
    @blp.doc(description="Get detailed information about a specific recommendation")
    def get(self, recommendation_id):
        """Get detailed information about a specific recommendation"""
        try:
            recommendation_service = RecommendationService()
            recommendation = recommendation_service.get_recommendation_details(recommendation_id)
            
            if not recommendation:
                abort(404, message='Recommendation not found')
            
            # Check if user has access to this recommendation
            if recommendation['user_id'] != 1:
                # Check if user has access to the zone
                zone = Zone.query.get(recommendation['zone_id'])
                if not zone or zone.user_id != 1:
                    abort(403, message='Access denied')
            
            return {
                'success': True,
                'data': recommendation
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendation details: {str(e)}")
            abort(500, message='Internal server error')

@blp.route('/ai/status')
class AIServiceStatus(MethodView):
    @blp.response(200, RecommendationResponseSchema)
    @blp.doc(description="Get the status of the AI service")
    def get(self):
        """Get the status of the AI service"""
        try:
            recommendation_service = RecommendationService()
            status = recommendation_service.get_ai_service_status()
            
            return {
                'success': True,
                'data': status
            }
            
        except Exception as e:
            logger.error(f"Error getting AI service status: {str(e)}")
            abort(500, message='Internal server error')

@blp.route('/mock/iot-data')
class MockIoTDataIngestion(MethodView):
    @blp.arguments(IoTDataIngestionSchema)
    @blp.response(200, RecommendationResponseSchema)
    @blp.doc(description="Mock endpoint for ingesting IoT sensor data")
    def post(self, args):
        """Mock endpoint for ingesting IoT sensor data"""
        try:
            zone_id = args['zone_id']
            sensor_data = args['sensor_data']
            
            # Check if zone exists
            zone = Zone.query.get(zone_id)
            if not zone:
                abort(404, message='Zone not found')
            
            # In a real implementation, this would store the sensor data
            # For now, we'll just return a success message
            logger.info(f"Mock IoT data ingestion for zone {zone_id}: {sensor_data}")
            
            # Generate recommendation from the sensor data
            recommendation_service = RecommendationService()
            
            # Add timestamp to sensor data
            sensor_data['timestamp'] = datetime.utcnow().isoformat()
            
            result = recommendation_service.generate_recommendation_from_sensors(
                sensor_data=sensor_data,
                weather_data=data.get('weather_data'),
                zone_info={'zone_id': zone_id, 'zone_name': zone.name},
                user_id=1
            )
            
            return {
                'success': True,
                'message': 'IoT data ingested and recommendation generated successfully',
                'data': {
                    'ingestion_status': 'success',
                    'recommendation': result
                }
            }
            
        except Exception as e:
            logger.error(f"Error in mock IoT data ingestion: {str(e)}")
            abort(500, message='Internal server error')

@blp.route('/cleanup')
class CleanupOldRecommendations(MethodView):
    @blp.arguments(CleanupSchema)
    @blp.response(200, RecommendationResponseSchema)
    @blp.doc(description="Clean up old recommendations (admin only)")
    def post(self, args):
        """Clean up old recommendations (admin only)"""
        try:
            days_to_keep = args.get('days_to_keep', 90)
            
            recommendation_service = RecommendationService()
            deleted_count = recommendation_service.cleanup_old_recommendations(days_to_keep)
            
            return {
                'success': True,
                'message': f'Cleanup completed successfully',
                'data': {
                    'deleted_count': deleted_count,
                    'days_to_keep': days_to_keep
                }
            }
            
        except Exception as e:
            logger.error(f"Error cleaning up old recommendations: {str(e)}")
            abort(500, message='Internal server error')

# Keep the old blueprint routes for backward compatibility
@recommendations_bp.route('/generate', methods=['POST'])
def generate_recommendation():
    """Generate crop recommendation for a zone using historical data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        zone_id = data.get('zone_id')
        start_date_str = data.get('start_date')
        end_date_str = data.get('end_date')
        
        if not zone_id:
            return jsonify({'error': 'zone_id is required'}), 400
        
        # Parse dates if provided
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use ISO 8601 format'}), 400
        
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use ISO 8601 format'}), 400
        
        # Check if user has access to the zone
        zone = Zone.query.get(zone_id)
        if not zone:
            return jsonify({'error': 'Zone not found'}), 404
        
        # For now, allow any authenticated user to access any zone
        # In production, you'd want to check zone ownership/permissions
        
        recommendation_service = RecommendationService()
        
        result = recommendation_service.generate_recommendation_from_zone(
            zone_id=zone_id,
            user_id=1,
            start_date=start_date,
            end_date=end_date
        )
        
        return jsonify({
            'success': True,
            'message': 'Recommendation generated successfully',
            'data': result
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error generating recommendation: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@recommendations_bp.route('/direct', methods=['POST'])
def generate_direct_recommendation():
    """
    Generate crop recommendation directly from sensor data and weather data
    This endpoint is useful for real-time recommendations from IoT devices
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        sensor_data = data.get('sensor_data', {})
        weather_data = data.get('weather_data', {})
        zone_info = data.get('zone_info', {})
        
        if not sensor_data:
            return jsonify({'error': 'sensor_data is required'}), 400
        
        # Validate required sensor data fields
        required_fields = ['nitrogen', 'phosphorus', 'potassium', 'ph', 'soil_moisture']
        missing_fields = [field for field in required_fields if field not in sensor_data or sensor_data[field] is None]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required sensor data fields: {missing_fields}',
                'required_fields': required_fields
            }), 400
        
        # Validate data types and ranges
        validation_errors = []
        
        # pH validation
        if 'ph' in sensor_data:
            try:
                ph = float(sensor_data['ph'])
                if not (3.0 <= ph <= 11.0):
                    validation_errors.append('pH must be between 3.0 and 11.0')
            except (ValueError, TypeError):
                validation_errors.append('pH must be a valid number')
        
        # Soil moisture validation
        if 'soil_moisture' in sensor_data:
            try:
                moisture = float(sensor_data['soil_moisture'])
                if not (0 <= moisture <= 100):
                    validation_errors.append('Soil moisture must be between 0 and 100')
            except (ValueError, TypeError):
                validation_errors.append('Soil moisture must be a valid number')
        
        # Nutrient validation
        for nutrient in ['nitrogen', 'phosphorus', 'potassium']:
            if nutrient in sensor_data:
                try:
                    value = float(sensor_data[nutrient])
                    if value < 0:
                        validation_errors.append(f'{nutrient.capitalize()} must be non-negative')
                except (ValueError, TypeError):
                    validation_errors.append(f'{nutrient.capitalize()} must be a valid number')
        
        if validation_errors:
            return jsonify({
                'error': 'Data validation failed',
                'validation_errors': validation_errors
            }), 400
        
        recommendation_service = RecommendationService()
        
        # Generate recommendation
        result = recommendation_service.generate_recommendation_from_sensors(
            sensor_data=sensor_data,
            weather_data=weather_data,
            zone_info=zone_info,
            user_id=1 if zone_info and zone_info.get('zone_id') else None
        )
        
        return jsonify({
            'success': True,
            'message': 'Direct recommendation generated successfully',
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating direct recommendation: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@recommendations_bp.route('/history/<int:zone_id>', methods=['GET'])
def get_recommendation_history(zone_id):
    """Get recommendation history for a specific zone"""
    try:
        limit = request.args.get('limit', 10, type=int)
        if limit > 100:
            limit = 100
        
        recommendation_service = RecommendationService()
        history = recommendation_service.get_recommendation_history(zone_id, limit)
        
        return jsonify({
            'success': True,
            'data': {
                'zone_id': zone_id,
                'history': history,
                'total': len(history)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting recommendation history: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@recommendations_bp.route('/user', methods=['GET'])
def get_user_recommendations():
    """Get all recommendations for the current user"""
    try:
        limit = request.args.get('limit', 20, type=int)
        if limit > 100:
            limit = 100
        
        recommendation_service = RecommendationService()
        recommendations = recommendation_service.get_user_recommendations(1, limit)
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': 1,
                'recommendations': recommendations,
                'total': len(recommendations)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user recommendations: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@recommendations_bp.route('/<int:recommendation_id>', methods=['GET'])
def get_recommendation_details(recommendation_id):
    """Get detailed information about a specific recommendation"""
    try:
        recommendation_service = RecommendationService()
        recommendation = recommendation_service.get_recommendation_details(recommendation_id)
        
        if not recommendation:
            return jsonify({'error': 'Recommendation not found'}), 404
        
        # Check if user has access to this recommendation
        if recommendation['user_id'] != 1:
            # Check if user has access to the zone
            zone = Zone.query.get(recommendation['zone_id'])
            if not zone or zone.user_id != 1:
                return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'success': True,
            'data': recommendation
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting recommendation details: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@recommendations_bp.route('/ai/status', methods=['GET'])
def get_ai_service_status():
    """Get the status of the AI service"""
    try:
        recommendation_service = RecommendationService()
        status = recommendation_service.get_ai_service_status()
        
        return jsonify({
            'success': True,
            'data': status
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting AI service status: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@recommendations_bp.route('/mock/iot-data', methods=['POST'])
def mock_iot_data_ingestion():
    """
    Mock endpoint for ingesting IoT sensor data
    This simulates what would happen when IoT devices send data
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['zone_id', 'sensor_data']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400
        
        zone_id = data['zone_id']
        sensor_data = data['sample_sensor_data']
        
        # Check if zone exists
        zone = Zone.query.get(zone_id)
        if not zone:
            return jsonify({'error': 'Zone not found'}), 404
        
        # In a real implementation, this would store the sensor data
        # For now, we'll just return a success message
        logger.info(f"Mock IoT data ingestion for zone {zone_id}: {sensor_data}")
        
        # Generate recommendation from the sensor data
        recommendation_service = RecommendationService()
        
        # Add timestamp to sensor data
        sensor_data['timestamp'] = datetime.utcnow().isoformat()
        
        result = recommendation_service.generate_recommendation_from_sensors(
            sensor_data=sensor_data,
            weather_data=data.get('weather_data'),
            zone_info={'zone_id': zone_id, 'zone_name': zone.name},
            user_id=1
        )
        
        return jsonify({
            'success': True,
            'message': 'IoT data ingested and recommendation generated successfully',
            'data': {
                'ingestion_status': 'success',
                'recommendation': result
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in mock IoT data ingestion: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@recommendations_bp.route('/cleanup', methods=['POST'])
def cleanup_old_recommendations():
    """Clean up old recommendations (admin only)"""
    try:
        data = request.get_json() or {}
        days_to_keep = data.get('days_to_keep', 90)
        
        if days_to_keep < 1:
            return jsonify({'error': 'days_to_keep must be at least 1'}), 400
        
        recommendation_service = RecommendationService()
        deleted_count = recommendation_service.cleanup_old_recommendations(days_to_keep)
        
        return jsonify({
            'success': True,
            'message': f'Cleanup completed successfully',
            'data': {
                'deleted_count': deleted_count,
                'days_to_keep': days_to_keep
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error cleaning up old recommendations: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500 