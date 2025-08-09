from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Zone, User, UserRole, Recommendation, RecommendationStatus
from app.schemas import ZoneSchema, PaginationSchema
from app.utils import require_role, audit_log, paginate_query, require_zone_access
from marshmallow import ValidationError
from sqlalchemy import func

zones_bp = Blueprint('zones', __name__)
zone_schema = ZoneSchema()
pagination_schema = PaginationSchema()

@zones_bp.route('/', methods=['GET'])
@jwt_required()
@require_role('exporter', 'central_admin', 'zone_admin')
def get_zones():
    """Get zones with role-based access"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Parse pagination
    try:
        pagination_data = pagination_schema.load(request.args)
    except ValidationError as err:
        return jsonify({'error': 'Invalid pagination parameters', 'details': err.messages}), 400
    
    # Build query based on role
    query = Zone.query
    
    if current_user.role == UserRole.ZONE_ADMIN:
        # Zone admins can only see their zones
        query = query.filter_by(zone_admin_id=current_user.id)
    elif current_user.role == UserRole.EXPORTER:
        # Exporters see summary of all zones with approved recommendations
        query = query.join(Recommendation).filter(
            Recommendation.status == RecommendationStatus.APPROVED
        ).distinct()
    
    # Search by name
    search = request.args.get('search')
    if search:
        query = query.filter(Zone.name.ilike(f'%{search}%'))
    
    # Paginate results
    result = paginate_query(
        query, 
        page=pagination_data['page'], 
        per_page=pagination_data['per_page']
    )
    
    # Add additional data for each zone
    for zone_data in result['items']:
        zone_id = zone_data['id']
        
        # Get IoT health summary
        from app.models import IoT, IoTHealth
        iot_summary = db.session.query(
            func.count(IoT.id).label('total'),
            func.sum(func.case((IoT.health == IoTHealth.OK, 1), else_=0)).label('ok'),
            func.sum(func.case((IoT.health == IoTHealth.WARNING, 1), else_=0)).label('warning'),
            func.sum(func.case((IoT.health == IoTHealth.OFFLINE, 1), else_=0)).label('offline')
        ).filter_by(zone_id=zone_id).first()
        
        zone_data['iot_health_summary'] = {
            'total': iot_summary.total or 0,
            'ok': iot_summary.ok or 0,
            'warning': iot_summary.warning or 0,
            'offline': iot_summary.offline or 0
        }
        
        # Get top recommendations (for exporters)
        if current_user.role == UserRole.EXPORTER:
            top_recs = Recommendation.query.filter_by(
                zone_id=zone_id,
                status=RecommendationStatus.APPROVED
            ).order_by(Recommendation.created_at.desc()).limit(3).all()
            
            zone_data['top_recommendations'] = [
                {
                    'id': rec.id,
                    'crops': rec.crops,
                    'created_at': rec.created_at.isoformat() if rec.created_at else None
                }
                for rec in top_recs
            ]
    
    return jsonify(result), 200

@zones_bp.route('/<int:zone_id>', methods=['GET'])
@jwt_required()
@require_zone_access('zone_id')
def get_zone(zone_id):
    """Get specific zone details"""
    zone = Zone.query.get(zone_id)
    if not zone:
        return jsonify({'error': 'Zone not found'}), 404
    
    zone_data = zone_schema.dump(zone)
    
    # Add zone admin info
    if zone.zone_admin:
        zone_data['zone_admin'] = {
            'id': zone.zone_admin.id,
            'first_name': zone.zone_admin.first_name,
            'last_name': zone.zone_admin.last_name,
            'email': zone.zone_admin.email
        }
    
    # Add IoT count
    zone_data['iot_count'] = len(zone.iots)
    
    # Add recent data count
    from datetime import datetime, timedelta
    from app.models import ZoneLandCondition
    recent_data = ZoneLandCondition.query.filter_by(zone_id=zone_id).filter(
        ZoneLandCondition.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    zone_data['recent_data_count'] = recent_data
    
    return jsonify(zone_data), 200

@zones_bp.route('/', methods=['POST'])
@jwt_required()
@require_role('central_admin')
def create_zone():
    """Create a new zone - central_admin only"""
    try:
        data = zone_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Check if zone admin exists and has correct role
    if data.get('zone_admin_id'):
        zone_admin = User.query.get(data['zone_admin_id'])
        if not zone_admin or zone_admin.role != UserRole.ZONE_ADMIN:
            return jsonify({'error': 'Zone admin must be a user with zone_admin role'}), 400
    
    zone = Zone(
        name=data['name'],
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        area_hectare=data.get('area_hectare'),
        zone_admin_id=data.get('zone_admin_id')
    )
    
    db.session.add(zone)
    db.session.commit()
    
    # Audit log
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'zone_created', 'zone', zone.id, {
        'zone_name': zone.name,
        'zone_admin_id': zone.zone_admin_id
    })
    
    return jsonify(zone_schema.dump(zone)), 201

@zones_bp.route('/<int:zone_id>', methods=['PUT'])
@jwt_required()
@require_role('central_admin')
def update_zone(zone_id):
    """Update zone details - central_admin only"""
    zone = Zone.query.get(zone_id)
    if not zone:
        return jsonify({'error': 'Zone not found'}), 404
    
    try:
        data = zone_schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Check zone admin if being updated
    if data.get('zone_admin_id'):
        zone_admin = User.query.get(data['zone_admin_id'])
        if not zone_admin or zone_admin.role != UserRole.ZONE_ADMIN:
            return jsonify({'error': 'Zone admin must be a user with zone_admin role'}), 400
    
    # Update fields
    for field, value in data.items():
        if hasattr(zone, field):
            setattr(zone, field, value)
    
    db.session.commit()
    
    # Audit log
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'zone_updated', 'zone', zone.id)
    
    return jsonify(zone_schema.dump(zone)), 200

@zones_bp.route('/<int:zone_id>', methods=['DELETE'])
@jwt_required()
@require_role('central_admin')
def delete_zone(zone_id):
    """Delete zone - central_admin only"""
    zone = Zone.query.get(zone_id)
    if not zone:
        return jsonify({'error': 'Zone not found'}), 404
    
    # Store zone info for audit log
    zone_info = zone_schema.dump(zone)
    
    db.session.delete(zone)
    db.session.commit()
    
    # Audit log
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'zone_deleted', 'zone', zone_id, zone_info)
    
    return jsonify({'message': 'Zone deleted successfully'}), 200

@zones_bp.route('/<int:zone_id>/opportunities', methods=['GET'])
@jwt_required()
@require_role('exporter', 'central_admin')
@require_zone_access('zone_id')
def get_zone_opportunities(zone_id):
    """Get approved recommendations for a zone (exporters)"""
    # Parse pagination
    try:
        pagination_data = pagination_schema.load(request.args)
    except ValidationError as err:
        return jsonify({'error': 'Invalid pagination parameters', 'details': err.messages}), 400
    
    # Get approved recommendations
    query = Recommendation.query.filter_by(
        zone_id=zone_id,
        status=RecommendationStatus.APPROVED
    ).order_by(Recommendation.created_at.desc())
    
    result = paginate_query(
        query, 
        page=pagination_data['page'], 
        per_page=pagination_data['per_page']
    )
    
    # Format opportunities for exporters
    opportunities = []
    for rec in result['items']:
        if rec.get('crops'):
            for crop in rec['crops']:
                opportunities.append({
                    'recommendation_id': rec['id'],
                    'crop_name': crop.get('crop_name'),
                    'suitability_score': crop.get('suitability_score'),
                    'soil_type': crop.get('soil_type'),
                    'key_environmental_factors': crop.get('key_environmental_factors'),
                    'created_at': rec['created_at']
                })
    
    result['items'] = opportunities
    return jsonify(result), 200 