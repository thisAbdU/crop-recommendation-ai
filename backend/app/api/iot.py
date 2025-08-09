from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import IoT, User, UserRole, IoTHealth
from app.schemas import IoTSchema, PaginationSchema
from app.utils import require_role, audit_log, paginate_query, require_zone_access
from marshmallow import ValidationError
from datetime import datetime

iot_bp = Blueprint('iot', __name__)
iot_schema = IoTSchema()
pagination_schema = PaginationSchema()

@iot_bp.route('/', methods=['GET'])
@jwt_required()
@require_role('central_admin', 'zone_admin', 'technician')
def get_iots():
    """Get IoT devices with filtering"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Parse pagination
    try:
        pagination_data = pagination_schema.load(request.args)
    except ValidationError as err:
        return jsonify({'error': 'Invalid pagination parameters', 'details': err.messages}), 400
    
    # Build query based on role
    query = IoT.query
    
    if current_user.role == UserRole.ZONE_ADMIN:
        # Zone admins see devices in their zones
        query = query.filter_by(zone_id=current_user.zone_id)
    elif current_user.role == UserRole.TECHNICIAN:
        # Technicians see devices assigned to them
        query = query.filter_by(assigned_to_technician_id=current_user.id)
    
    # Filter by zone
    zone_filter = request.args.get('zone_id')
    if zone_filter and current_user.role == UserRole.CENTRAL_ADMIN:
        query = query.filter_by(zone_id=int(zone_filter))
    
    # Filter by health status
    health_filter = request.args.get('health')
    if health_filter:
        try:
            health_enum = IoTHealth(health_filter)
            query = query.filter_by(health=health_enum)
        except ValueError:
            return jsonify({'error': 'Invalid health status'}), 400
    
    # Search by name or tag_sn
    search = request.args.get('search')
    if search:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                IoT.name.ilike(f'%{search}%'),
                IoT.tag_sn.ilike(f'%{search}%')
            )
        )
    
    # Paginate results
    result = paginate_query(
        query, 
        page=pagination_data['page'], 
        per_page=pagination_data['per_page']
    )
    
    return jsonify(result), 200

@iot_bp.route('/<int:iot_id>', methods=['GET'])
@jwt_required()
@require_role('central_admin', 'zone_admin', 'technician')
def get_iot(iot_id):
    """Get specific IoT device details"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    iot = IoT.query.get(iot_id)
    if not iot:
        return jsonify({'error': 'IoT device not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if iot.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    elif current_user.role == UserRole.TECHNICIAN:
        if iot.assigned_to_technician_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
    
    iot_data = iot_schema.dump(iot)
    
    # Add zone info
    iot_data['zone'] = {
        'id': iot.zone.id,
        'name': iot.zone.name
    }
    
    # Add assigned technician info
    if iot.assigned_technician:
        iot_data['assigned_technician'] = {
            'id': iot.assigned_technician.id,
            'first_name': iot.assigned_technician.first_name,
            'last_name': iot.assigned_technician.last_name
        }
    
    return jsonify(iot_data), 200

@iot_bp.route('/', methods=['POST'])
@jwt_required()
@require_role('central_admin', 'zone_admin')
def create_iot():
    """Create a new IoT device"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    try:
        data = iot_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Check if tag_sn already exists
    if IoT.query.filter_by(tag_sn=data['tag_sn']).first():
        return jsonify({'error': 'Device with this tag_sn already exists'}), 409
    
    # Zone admins can only create devices in their zones
    if current_user.role == UserRole.ZONE_ADMIN:
        data['zone_id'] = current_user.zone_id
    
    # Check if assigned technician exists and has correct role
    if data.get('assigned_to_technician_id'):
        technician = User.query.get(data['assigned_to_technician_id'])
        if not technician or technician.role != UserRole.TECHNICIAN:
            return jsonify({'error': 'Assigned technician must be a user with technician role'}), 400
    
    iot = IoT(
        name=data['name'],
        tag_sn=data['tag_sn'],
        health=data.get('health', IoTHealth.OK),
        assigned_to_technician_id=data.get('assigned_to_technician_id'),
        zone_id=data['zone_id'],
        device_metadata=data.get('metadata', {})
    )
    
    db.session.add(iot)
    db.session.commit()
    
    # Audit log
    audit_log(current_user_id, 'iot_created', 'iot', iot.id, {
        'device_name': iot.name,
        'tag_sn': iot.tag_sn,
        'zone_id': iot.zone_id
    })
    
    return jsonify(iot_schema.dump(iot)), 201

@iot_bp.route('/<int:iot_id>', methods=['PUT'])
@jwt_required()
@require_role('central_admin', 'zone_admin', 'technician')
def update_iot(iot_id):
    """Update IoT device details"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    iot = IoT.query.get(iot_id)
    if not iot:
        return jsonify({'error': 'IoT device not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if iot.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    elif current_user.role == UserRole.TECHNICIAN:
        if iot.assigned_to_technician_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = iot_schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Check tag_sn uniqueness if being updated
    if data.get('tag_sn') and data['tag_sn'] != iot.tag_sn:
        if IoT.query.filter_by(tag_sn=data['tag_sn']).first():
            return jsonify({'error': 'Device with this tag_sn already exists'}), 409
    
    # Update fields
    for field, value in data.items():
        if hasattr(iot, field):
            setattr(iot, field, value)
    
    db.session.commit()
    
    # Audit log
    audit_log(current_user_id, 'iot_updated', 'iot', iot.id)
    
    return jsonify(iot_schema.dump(iot)), 200

@iot_bp.route('/<int:iot_id>', methods=['DELETE'])
@jwt_required()
@require_role('central_admin', 'zone_admin')
def delete_iot(iot_id):
    """Delete IoT device"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    iot = IoT.query.get(iot_id)
    if not iot:
        return jsonify({'error': 'IoT device not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if iot.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    
    # Store device info for audit log
    iot_info = iot_schema.dump(iot)
    
    db.session.delete(iot)
    db.session.commit()
    
    # Audit log
    audit_log(current_user_id, 'iot_deleted', 'iot', iot_id, iot_info)
    
    return jsonify({'message': 'IoT device deleted successfully'}), 200

@iot_bp.route('/<int:iot_id>/health', methods=['GET'])
@jwt_required()
@require_role('central_admin', 'zone_admin', 'technician')
def get_iot_health(iot_id):
    """Get IoT device health status"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    iot = IoT.query.get(iot_id)
    if not iot:
        return jsonify({'error': 'IoT device not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if iot.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    elif current_user.role == UserRole.TECHNICIAN:
        if iot.assigned_to_technician_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
    
    # Calculate health metrics
    from app.models import ZoneLandCondition
    from datetime import datetime, timedelta
    
    # Get recent readings
    recent_readings = ZoneLandCondition.query.filter_by(
        device_tag=iot.tag_sn
    ).filter(
        ZoneLandCondition.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    
    # Determine if device is offline (no readings in last 24 hours)
    last_24h_readings = ZoneLandCondition.query.filter_by(
        device_tag=iot.tag_sn
    ).filter(
        ZoneLandCondition.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    is_offline = last_24h_readings == 0
    
    health_data = {
        'device_id': iot.id,
        'device_name': iot.name,
        'tag_sn': iot.tag_sn,
        'health': iot.health.value,
        'last_seen_at': iot.last_seen_at.isoformat() if iot.last_seen_at else None,
        'recent_readings_count': recent_readings,
        'last_24h_readings': last_24h_readings,
        'is_offline': is_offline,
        'errors': []
    }
    
    # Add error conditions
    if is_offline:
        health_data['errors'].append('No readings in last 24 hours')
    
    if iot.health == IoTHealth.WARNING:
        health_data['errors'].append('Device reported warning status')
    
    return jsonify(health_data), 200

@iot_bp.route('/health', methods=['GET'])
@jwt_required()
@require_role('central_admin', 'zone_admin')
def get_aggregated_health():
    """Get aggregated IoT health for all accessible zones"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Build query based on role
    query = IoT.query
    
    if current_user.role == UserRole.ZONE_ADMIN:
        query = query.filter_by(zone_id=current_user.zone_id)
    
    # Get health summary
    from sqlalchemy import func
    health_summary = db.session.query(
        func.count(IoT.id).label('total'),
        func.sum(func.case((IoT.health == IoTHealth.OK, 1), else_=0)).label('ok'),
        func.sum(func.case((IoT.health == IoTHealth.WARNING, 1), else_=0)).label('warning'),
        func.sum(func.case((IoT.health == IoTHealth.OFFLINE, 1), else_=0)).label('offline'),
        func.sum(func.case((IoT.health == IoTHealth.MAINTENANCE, 1), else_=0)).label('maintenance')
    ).filter(query.whereclause).first()
    
    # Get offline devices (no readings in last 24 hours)
    from datetime import datetime, timedelta
    from app.models import ZoneLandCondition
    
    offline_devices = []
    for iot in query.all():
        last_24h_readings = ZoneLandCondition.query.filter_by(
            device_tag=iot.tag_sn
        ).filter(
            ZoneLandCondition.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        if last_24h_readings == 0:
            offline_devices.append({
                'id': iot.id,
                'name': iot.name,
                'tag_sn': iot.tag_sn,
                'zone_id': iot.zone_id
            })
    
    return jsonify({
        'summary': {
            'total': health_summary.total or 0,
            'ok': health_summary.ok or 0,
            'warning': health_summary.warning or 0,
            'offline': health_summary.offline or 0,
            'maintenance': health_summary.maintenance or 0
        },
        'offline_devices': offline_devices
    }), 200 