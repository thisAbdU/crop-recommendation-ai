from flask import Blueprint, request, jsonify, current_app
# from flask_login import login_required, current_user
from datetime import datetime, timedelta
import logging
from typing import Dict, Any, Optional

from ..services.recommendation_service import RecommendationService
from ..services.weather_service import WeatherService
from ..services.iot_service import IoTService
from ..models import db, Zone, User, Recommendation
from ..utils import require_role, require_zone_access

logger = logging.getLogger(__name__)

recommendations_bp = Blueprint('recommendations', __name__)

@recommendations_bp.route('/generate', methods=['POST'])
# @login_required
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
# @login_required
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
# @login_required
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
# @login_required
def get_user_recommendations():
    """Get all recommendations for the current user"""
    try:
        limit = request.args.get('limit', 20, type=int)
        if limit > 100:
            limit = 100
        
        recommendation_service = RecommendationService()
        recommendations = recommendation_service.get_user_recommendations(current_user.id, limit)
        
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
# @login_required
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
# @login_required
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
# @login_required
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
        sensor_data = data['sensor_data']
        
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
# @admin_required
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