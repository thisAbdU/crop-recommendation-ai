from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Recommendation, Zone, User, UserRole, RecommendationStatus
from app.schemas import RecommendationSchema, RecommendationRequestSchema, PaginationSchema
from app.utils import require_role, audit_log, paginate_query, require_zone_access
from app.services.recommendation_service import RecommendationService
from marshmallow import ValidationError
from datetime import datetime

recommendations_bp = Blueprint('recommendations', __name__)
recommendation_schema = RecommendationSchema()
recommendation_request_schema = RecommendationRequestSchema()
pagination_schema = PaginationSchema()

@recommendations_bp.route('/zones/<int:zone_id>/recommend', methods=['POST'])
@jwt_required()
@require_role('zone_admin', 'central_admin')
@require_zone_access('zone_id')
def trigger_recommendation(zone_id):
    """Trigger a crop suitability recommendation for a zone"""
    current_user_id = get_jwt_identity()
    
    # Verify zone exists
    zone = Zone.query.get(zone_id)
    if not zone:
        return jsonify({'error': 'Zone not found'}), 404
    
    try:
        data = recommendation_request_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Validate time range
    if data['start'] >= data['end']:
        return jsonify({'error': 'Start time must be before end time'}), 400
    
    # Check if there's already a pending recommendation for this zone and time range
    existing_pending = Recommendation.query.filter_by(
        zone_id=zone_id,
        status=RecommendationStatus.PENDING
    ).first()
    
    if existing_pending:
        return jsonify({'error': 'There is already a pending recommendation for this zone'}), 409
    
    # Create recommendation record
    recommendation = Recommendation(
        zone_id=zone_id,
        start_time=data['start'],
        end_time=data['end'],
        prompt_template_id=data.get('prompt_template_id'),
        created_by=current_user_id,
        status=RecommendationStatus.PENDING
    )
    
    db.session.add(recommendation)
    db.session.commit()
    
    # Enqueue background task
    try:
        from app.tasks.rec_tasks import generate_recommendation_task
        generate_recommendation_task.delay(recommendation.id)
    except Exception as e:
        # If task enqueue fails, mark as failed
        recommendation.status = RecommendationStatus.FAILED
        recommendation.response = f"Failed to enqueue task: {str(e)}"
        db.session.commit()
        return jsonify({'error': 'Failed to start recommendation generation'}), 500
    
    # Audit log
    audit_log(current_user_id, 'recommendation_triggered', 'recommendation', recommendation.id, {
        'zone_id': zone_id,
        'start_time': data['start'].isoformat(),
        'end_time': data['end'].isoformat()
    })
    
    return jsonify({
        'recommendation_id': recommendation.id,
        'status': recommendation.status.value,
        'message': 'Recommendation generation started'
    }), 202

@recommendations_bp.route('/<int:recommendation_id>', methods=['GET'])
@jwt_required()
def get_recommendation(recommendation_id):
    """Get specific recommendation details"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    recommendation = Recommendation.query.get(recommendation_id)
    if not recommendation:
        return jsonify({'error': 'Recommendation not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.EXPORTER:
        # Exporters can only see approved recommendations
        if recommendation.status != RecommendationStatus.APPROVED:
            return jsonify({'error': 'Access denied'}), 403
    elif current_user.role == UserRole.ZONE_ADMIN:
        # Zone admins can see recommendations for their zones
        if recommendation.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    elif current_user.role == UserRole.TECHNICIAN:
        # Technicians can see recommendations for zones they're assigned to
        if recommendation.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    
    recommendation_data = recommendation_schema.dump(recommendation)
    
    # Add zone info
    recommendation_data['zone'] = {
        'id': recommendation.zone.id,
        'name': recommendation.zone.name
    }
    
    # Add creator info
    if recommendation.created_by_user:
        recommendation_data['created_by'] = {
            'id': recommendation.created_by_user.id,
            'first_name': recommendation.created_by_user.first_name,
            'last_name': recommendation.created_by_user.last_name
        }
    
    # Add approver info
    if recommendation.approved_by_user:
        recommendation_data['approved_by'] = {
            'id': recommendation.approved_by_user.id,
            'first_name': recommendation.approved_by_user.first_name,
            'last_name': recommendation.approved_by_user.last_name
        }
    
    return jsonify(recommendation_data), 200

@recommendations_bp.route('/<int:recommendation_id>/regenerate', methods=['POST'])
@jwt_required()
@require_role('zone_admin', 'central_admin')
def regenerate_recommendation(recommendation_id):
    """Regenerate a recommendation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    recommendation = Recommendation.query.get(recommendation_id)
    if not recommendation:
        return jsonify({'error': 'Recommendation not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if recommendation.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    
    # Mark current recommendation as regenerated
    recommendation.status = RecommendationStatus.REGENERATED
    db.session.commit()
    
    # Create new recommendation record
    new_recommendation = Recommendation(
        zone_id=recommendation.zone_id,
        start_time=recommendation.start_time,
        end_time=recommendation.end_time,
        prompt_template_id=recommendation.prompt_template_id,
        created_by=current_user_id,
        status=RecommendationStatus.PENDING
    )
    
    db.session.add(new_recommendation)
    db.session.commit()
    
    # Enqueue background task
    try:
        from app.tasks.rec_tasks import generate_recommendation_task
        generate_recommendation_task.delay(new_recommendation.id)
    except Exception as e:
        new_recommendation.status = RecommendationStatus.FAILED
        new_recommendation.response = f"Failed to enqueue task: {str(e)}"
        db.session.commit()
        return jsonify({'error': 'Failed to start recommendation regeneration'}), 500
    
    # Audit log
    audit_log(current_user_id, 'recommendation_regenerated', 'recommendation', new_recommendation.id, {
        'original_recommendation_id': recommendation_id,
        'zone_id': recommendation.zone_id
    })
    
    return jsonify({
        'recommendation_id': new_recommendation.id,
        'status': new_recommendation.status.value,
        'message': 'Recommendation regeneration started'
    }), 202

@recommendations_bp.route('/<int:recommendation_id>/approve', methods=['POST'])
@jwt_required()
@require_role('zone_admin', 'central_admin')
def approve_recommendation(recommendation_id):
    """Approve a recommendation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    recommendation = Recommendation.query.get(recommendation_id)
    if not recommendation:
        return jsonify({'error': 'Recommendation not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if recommendation.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    
    # Check if recommendation is in generated state
    if recommendation.status != RecommendationStatus.GENERATED:
        return jsonify({'error': 'Only generated recommendations can be approved'}), 400
    
    # Approve the recommendation
    recommendation.status = RecommendationStatus.APPROVED
    recommendation.approved_by = current_user_id
    recommendation.approved_at = datetime.utcnow()
    
    db.session.commit()
    
    # Audit log
    audit_log(current_user_id, 'recommendation_approved', 'recommendation', recommendation_id, {
        'zone_id': recommendation.zone_id
    })
    
    return jsonify({
        'message': 'Recommendation approved successfully',
        'recommendation_id': recommendation_id
    }), 200

@recommendations_bp.route('/<int:recommendation_id>/decline', methods=['POST'])
@jwt_required()
@require_role('zone_admin', 'central_admin')
def decline_recommendation(recommendation_id):
    """Decline a recommendation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    recommendation = Recommendation.query.get(recommendation_id)
    if not recommendation:
        return jsonify({'error': 'Recommendation not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if recommendation.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    
    # Check if recommendation is in generated state
    if recommendation.status != RecommendationStatus.GENERATED:
        return jsonify({'error': 'Only generated recommendations can be declined'}), 400
    
    # Get decline reason from request
    data = request.get_json() or {}
    reason = data.get('reason', 'No reason provided')
    
    # Decline the recommendation
    recommendation.status = RecommendationStatus.DECLINED
    recommendation.response = f"Declined: {reason}"
    
    db.session.commit()
    
    # Audit log
    audit_log(current_user_id, 'recommendation_declined', 'recommendation', recommendation_id, {
        'zone_id': recommendation.zone_id,
        'reason': reason
    })
    
    return jsonify({
        'message': 'Recommendation declined successfully',
        'recommendation_id': recommendation_id
    }), 200

@recommendations_bp.route('/', methods=['GET'])
@jwt_required()
def get_recommendations():
    """Get recommendations with filtering and pagination"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Parse pagination
    try:
        pagination_data = pagination_schema.load(request.args)
    except ValidationError as err:
        return jsonify({'error': 'Invalid pagination parameters', 'details': err.messages}), 400
    
    # Build query based on role
    query = Recommendation.query
    
    if current_user.role == UserRole.EXPORTER:
        # Exporters can only see approved recommendations
        query = query.filter_by(status=RecommendationStatus.APPROVED)
    elif current_user.role == UserRole.ZONE_ADMIN:
        # Zone admins see recommendations for their zones
        query = query.filter_by(zone_id=current_user.zone_id)
    elif current_user.role == UserRole.TECHNICIAN:
        # Technicians see recommendations for their zones
        query = query.filter_by(zone_id=current_user.zone_id)
    
    # Filter by status
    status_filter = request.args.get('status')
    if status_filter:
        try:
            status_enum = RecommendationStatus(status_filter)
            query = query.filter_by(status=status_enum)
        except ValueError:
            return jsonify({'error': 'Invalid status'}), 400
    
    # Filter by zone (for central admin)
    zone_filter = request.args.get('zone_id')
    if zone_filter and current_user.role == UserRole.CENTRAL_ADMIN:
        query = query.filter_by(zone_id=int(zone_filter))
    
    # Filter by date range
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Recommendation.created_at >= start)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format'}), 400
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Recommendation.created_at <= end)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format'}), 400
    
    # Paginate results
    result = paginate_query(
        query.order_by(Recommendation.created_at.desc()),
        page=pagination_data['page'],
        per_page=pagination_data['per_page']
    )
    
    # Add zone info to each recommendation
    for rec_data in result['items']:
        zone = Zone.query.get(rec_data['zone_id'])
        if zone:
            rec_data['zone_name'] = zone.name
    
    return jsonify(result), 200 