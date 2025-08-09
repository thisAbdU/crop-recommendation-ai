from flask import Blueprint, jsonify
from flask_smorest import Blueprint as SmorestBlueprint, abort
from app import db
import redis
import requests
from datetime import datetime
import os

# Create Flask-Smorest blueprint
blp = SmorestBlueprint('health', __name__, description='Health check and monitoring endpoints')

@blp.route('/health', methods=['GET'])
@blp.response(200, description="Health check successful")
@blp.response(503, description="One or more services unhealthy")
@blp.doc(
    summary="Health Check",
    description="Check the health status of all system services including database, Redis, AI service, and prompts directory."
)
def health_check():
    """Basic health check endpoint"""
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'services': {}
    }
    
    # Check database
    try:
        db.session.execute(db.text('SELECT 1'))
        health_status['services']['database'] = 'healthy'
    except Exception as e:
        health_status['services']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    # Check Redis (skip for now since we removed Redis)
    health_status['services']['redis'] = 'not_configured'
    
    # Check AI service
    try:
        from app.services.ai_client import AIClient
        ai_client = AIClient()
        # Simple test call
        ai_client.test_connection()
        health_status['services']['ai_service'] = 'healthy'
    except ImportError:
        health_status['services']['ai_service'] = 'not_configured'
    except Exception as e:
        health_status['services']['ai_service'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    # Check prompts directory
    try:
        from app.utils import ensure_prompts_dir
        prompts_dir = ensure_prompts_dir()
        if os.path.exists(prompts_dir):
            # Try to create a test file to check write permissions
            test_file = os.path.join(prompts_dir, '.test_write')
            try:
                with open(test_file, 'w') as f:
                    f.write('test')
                os.remove(test_file)
                health_status['services']['prompts_directory'] = 'healthy'
            except Exception as e:
                health_status['services']['prompts_directory'] = f'unhealthy: not writable - {str(e)}'
                health_status['status'] = 'unhealthy'
        else:
            health_status['services']['prompts_directory'] = 'unhealthy: directory does not exist'
            health_status['status'] = 'unhealthy'
    except Exception as e:
        health_status['services']['prompts_directory'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return health_status, status_code

@blp.route('/metrics', methods=['GET'])
@blp.response(200, description="System metrics retrieved successfully")
@blp.doc(
    summary="System Metrics",
    description="Get comprehensive system metrics including user counts, zone counts, IoT device health, and recent activity."
)
def get_metrics():
    """Get basic usage metrics"""
    from app.models import User, Zone, IoT, ZoneLandCondition, Recommendation, AuditLog
    from datetime import datetime, timedelta
    
    # Get counts
    total_users = User.query.count()
    total_zones = Zone.query.count()
    total_iots = IoT.query.count()
    total_readings = ZoneLandCondition.query.count()
    total_recommendations = Recommendation.query.count()
    
    # Get recent activity (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(hours=24)
    
    recent_readings = ZoneLandCondition.query.filter(
        ZoneLandCondition.created_at >= yesterday
    ).count()
    
    recent_recommendations = Recommendation.query.filter(
        Recommendation.created_at >= yesterday
    ).count()
    
    recent_audit_logs = AuditLog.query.filter(
        AuditLog.created_at >= yesterday
    ).count()
    
    # Get IoT health summary
    from app.models import IoTHealth
    from sqlalchemy import func
    
    iot_health = db.session.query(
        func.count(IoT.id).label('total'),
        func.sum(func.case((IoT.health == IoTHealth.OK, 1), else_=0)).label('ok'),
        func.sum(func.case((IoT.health == IoTHealth.WARNING, 1), else_=0)).label('warning'),
        func.sum(func.case((IoT.health == IoTHealth.OFFLINE, 1), else_=0)).label('offline'),
        func.sum(func.case((IoT.health == IoTHealth.MAINTENANCE, 1), else_=0)).label('maintenance')
    ).first()
    
    # Get recommendation status summary
    from app.models import RecommendationStatus
    
    rec_status = db.session.query(
        func.count(Recommendation.id).label('total'),
        func.sum(func.case((Recommendation.status == RecommendationStatus.PENDING, 1), else_=0)).label('pending'),
        func.sum(func.case((Recommendation.status == RecommendationStatus.GENERATED, 1), else_=0)).label('generated'),
        func.sum(func.case((Recommendation.status == RecommendationStatus.APPROVED, 1), else_=0)).label('approved'),
        func.sum(func.case((Recommendation.status == RecommendationStatus.DECLINED, 1), else_=0)).label('declined'),
        func.sum(func.case((Recommendation.status == RecommendationStatus.FAILED, 1), else_=0)).label('failed')
    ).first()
    
    metrics = {
        'timestamp': datetime.utcnow().isoformat(),
        'totals': {
            'users': total_users,
            'zones': total_zones,
            'iot_devices': total_iots,
            'sensor_readings': total_readings,
            'recommendations': total_recommendations
        },
        'recent_activity_24h': {
            'sensor_readings': recent_readings,
            'recommendations': recent_recommendations,
            'audit_logs': recent_audit_logs
        },
        'iot_health': {
            'total': iot_health.total or 0,
            'ok': iot_health.ok or 0,
            'warning': iot_health.warning or 0,
            'offline': iot_health.offline or 0,
            'maintenance': iot_health.maintenance or 0
        },
        'recommendation_status': {
            'total': rec_status.total or 0,
            'pending': rec_status.pending or 0,
            'generated': rec_status.generated or 0,
            'approved': rec_status.approved or 0,
            'declined': rec_status.declined or 0,
            'failed': rec_status.failed or 0
        }
    }
    
    return metrics, 200

@blp.route('/iots/health', methods=['GET'])
@blp.response(200, description="IoT health status retrieved successfully")
@blp.doc(
    summary="IoT Health Status",
    description="Get detailed IoT device health status including offline devices and devices with warnings."
)
def get_iots_health():
    """Get aggregated IoT health status"""
    from app.models import IoT, IoTHealth, ZoneLandCondition
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    # Get health summary
    health_summary = db.session.query(
        func.count(IoT.id).label('total'),
        func.sum(func.case((IoT.health == IoTHealth.OK, 1), else_=0)).label('ok'),
        func.sum(func.case((IoT.health == IoTHealth.WARNING, 1), else_=0)).label('warning'),
        func.sum(func.case((IoT.health == IoTHealth.OFFLINE, 1), else_=0)).label('offline'),
        func.sum(func.case((IoT.health == IoTHealth.MAINTENANCE, 1), else_=0)).label('maintenance')
    ).first()
    
    # Get offline devices (no readings in last 24 hours)
    yesterday = datetime.utcnow() - timedelta(hours=24)
    
    offline_devices = []
    for iot in IoT.query.all():
        last_24h_readings = ZoneLandCondition.query.filter_by(
            device_tag=iot.tag_sn
        ).filter(
            ZoneLandCondition.created_at >= yesterday
        ).count()
        
        if last_24h_readings == 0:
            offline_devices.append({
                'id': iot.id,
                'name': iot.name,
                'tag_sn': iot.tag_sn,
                'zone_id': iot.zone_id,
                'health': iot.health.value,
                'last_seen_at': iot.last_seen_at.isoformat() if iot.last_seen_at else None
            })
    
    # Get devices with warnings
    warning_devices = IoT.query.filter_by(health=IoTHealth.WARNING).all()
    warning_devices_data = []
    for iot in warning_devices:
        warning_devices_data.append({
            'id': iot.id,
            'name': iot.name,
            'tag_sn': iot.tag_sn,
            'zone_id': iot.zone_id,
            'last_seen_at': iot.last_seen_at.isoformat() if iot.last_seen_at else None
        })
    
    return {
        'summary': {
            'total': health_summary.total or 0,
            'ok': health_summary.ok or 0,
            'warning': health_summary.warning or 0,
            'offline': health_summary.offline or 0,
            'maintenance': health_summary.maintenance or 0
        },
        'offline_devices': offline_devices,
        'warning_devices': warning_devices_data,
        'timestamp': datetime.utcnow().isoformat()
    }, 200

# Keep the old blueprint for backward compatibility
health_bp = Blueprint('health', __name__) 