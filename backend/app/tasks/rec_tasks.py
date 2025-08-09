from celery import Celery
from app import create_app, db
from app.services.recommendation_service import RecommendationService
from app.utils import audit_log
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Create Celery app
def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker=app.config['CELERY_BROKER_URL']
    )
    
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

# Create Flask app and Celery instance
flask_app = create_app()
celery = make_celery(flask_app)

@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_recommendation_task(self, recommendation_id):
    """Generate a crop recommendation in the background"""
    try:
        logger.info(f"Starting recommendation generation for ID: {recommendation_id}")
        
        # Create service instance
        recommendation_service = RecommendationService()
        
        # Generate recommendation
        recommendation = recommendation_service.generate_recommendation(recommendation_id)
        
        # Log success
        audit_log(None, 'recommendation_generated', 'recommendation', recommendation_id, {
            'status': 'success',
            'crops_count': len(recommendation.crops) if recommendation.crops else 0
        })
        
        logger.info(f"Successfully generated recommendation {recommendation_id}")
        return {
            'status': 'success',
            'recommendation_id': recommendation_id,
            'crops_count': len(recommendation.crops) if recommendation.crops else 0
        }
        
    except Exception as exc:
        logger.error(f"Error generating recommendation {recommendation_id}: {str(exc)}")
        
        # Log failure
        audit_log(None, 'recommendation_generation_failed', 'recommendation', recommendation_id, {
            'error': str(exc),
            'attempt': self.request.retries + 1
        })
        
        # Retry if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying recommendation generation {recommendation_id}, attempt {self.request.retries + 1}")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for recommendation {recommendation_id}")
            return {
                'status': 'failed',
                'recommendation_id': recommendation_id,
                'error': str(exc)
            }

@celery.task(bind=True, max_retries=3, default_retry_delay=300)
def fetch_weather_task(self, zone_id):
    """Fetch weather data for a zone from OpenWeather API"""
    try:
        logger.info(f"Fetching weather data for zone: {zone_id}")
        
        from app.services.weather_service import WeatherService
        from app.models import Zone, ZoneLandCondition
        from datetime import datetime
        
        # Get zone coordinates
        zone = Zone.query.get(zone_id)
        if not zone or not zone.latitude or not zone.longitude:
            logger.warning(f"Zone {zone_id} not found or missing coordinates")
            return {'status': 'skipped', 'reason': 'zone_not_found_or_no_coordinates'}
        
        # Fetch weather data
        weather_service = WeatherService()
        weather_data = weather_service.get_forecast(zone.latitude, zone.longitude)
        
        if not weather_data:
            logger.warning(f"No weather data received for zone {zone_id}")
            return {'status': 'skipped', 'reason': 'no_weather_data'}
        
        # Store weather data as sensor readings
        for forecast in weather_data.get('forecast', []):
            reading = ZoneLandCondition(
                zone_id=zone_id,
                read_from_iot_at=datetime.fromisoformat(forecast['timestamp']),
                is_from_iot=False,  # This is weather data, not IoT data
                temperature=forecast.get('temperature'),
                humidity=forecast.get('humidity'),
                rainfall=forecast.get('rainfall'),
                device_tag='openweather_api'
            )
            db.session.add(reading)
        
        db.session.commit()
        
        logger.info(f"Successfully stored weather data for zone {zone_id}")
        return {
            'status': 'success',
            'zone_id': zone_id,
            'forecast_count': len(weather_data.get('forecast', []))
        }
        
    except Exception as exc:
        logger.error(f"Error fetching weather for zone {zone_id}: {str(exc)}")
        
        # Retry if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying weather fetch for zone {zone_id}, attempt {self.request.retries + 1}")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for weather fetch zone {zone_id}")
            return {
                'status': 'failed',
                'zone_id': zone_id,
                'error': str(exc)
            }

@celery.task
def cleanup_old_data_task():
    """Clean up old sensor data and audit logs"""
    try:
        logger.info("Starting cleanup of old data")
        
        from datetime import datetime, timedelta
        from app.models import ZoneLandCondition, AuditLog
        
        # Keep data for 1 year
        cutoff_date = datetime.utcnow() - timedelta(days=365)
        
        # Delete old sensor readings
        old_readings = ZoneLandCondition.query.filter(
            ZoneLandCondition.created_at < cutoff_date
        ).delete()
        
        # Delete old audit logs (keep for 6 months)
        audit_cutoff = datetime.utcnow() - timedelta(days=180)
        old_audit_logs = AuditLog.query.filter(
            AuditLog.created_at < audit_cutoff
        ).delete()
        
        logger.info(f"Cleanup completed: {old_readings} old readings, {old_audit_logs} old audit logs deleted")
        
        return {
            'status': 'success',
            'old_readings_deleted': old_readings,
            'old_audit_logs_deleted': old_audit_logs
        }
        
    except Exception as exc:
        logger.error(f"Error during cleanup: {str(exc)}")
        return {
            'status': 'failed',
            'error': str(exc)
        }

@celery.task
def health_check_task():
    """Periodic health check task"""
    try:
        logger.info("Running periodic health check")
        
        from app.services.ai_client import AIClient
        from app.utils import ensure_prompts_dir
        import redis
        
        health_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'services': {}
        }
        
        # Check database
        try:
            db.session.execute('SELECT 1')
            health_status['services']['database'] = 'healthy'
        except Exception as e:
            health_status['services']['database'] = f'unhealthy: {str(e)}'
        
        # Check Redis
        try:
            redis_client = redis.from_url(flask_app.config.get('CELERY_BROKER_URL'))
            redis_client.ping()
            health_status['services']['redis'] = 'healthy'
        except Exception as e:
            health_status['services']['redis'] = f'unhealthy: {str(e)}'
        
        # Check AI service
        try:
            ai_client = AIClient()
            ai_client.test_connection()
            health_status['services']['ai_service'] = 'healthy'
        except Exception as e:
            health_status['services']['ai_service'] = f'unhealthy: {str(e)}'
        
        # Check prompts directory
        try:
            prompts_dir = ensure_prompts_dir()
            import os
            if os.path.exists(prompts_dir) and os.access(prompts_dir, os.R_OK | os.W_OK):
                health_status['services']['prompts_directory'] = 'healthy'
            else:
                health_status['services']['prompts_directory'] = 'unhealthy: directory not accessible'
        except Exception as e:
            health_status['services']['prompts_directory'] = f'unhealthy: {str(e)}'
        
        logger.info(f"Health check completed: {health_status}")
        return health_status
        
    except Exception as exc:
        logger.error(f"Error during health check: {str(exc)}")
        return {
            'status': 'failed',
            'error': str(exc)
        } 