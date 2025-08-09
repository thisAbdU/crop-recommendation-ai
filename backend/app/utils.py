from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import User, UserRole, AuditLog
from datetime import datetime
import uuid
import os
from werkzeug.utils import secure_filename

def audit_log(user_id, action, object_type=None, object_id=None, meta=None):
    """Create an audit log entry"""
    log = AuditLog(
        user_id=user_id,
        action=action,
        object_type=object_type,
        object_id=object_id,
        meta=meta
    )
    db.session.add(log)
    db.session.commit()

def require_role(*roles):
    """Decorator to require specific user roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({'error': 'Authentication required'}), 401
            
            user = User.query.get(current_user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if user.role.value not in roles:
                return jsonify({'error': f'Insufficient permissions. Required roles: {roles}'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_zone_access(zone_id_param='zone_id'):
    """Decorator to ensure user has access to a specific zone"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({'error': 'Authentication required'}), 401
            
            user = User.query.get(current_user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Get zone_id from kwargs or request
            zone_id = kwargs.get(zone_id_param) or request.view_args.get(zone_id_param)
            if not zone_id:
                return jsonify({'error': 'Zone ID required'}), 400
            
            # Central admin can access all zones
            if user.role == UserRole.CENTRAL_ADMIN:
                return f(*args, **kwargs)
            
            # Zone admin can only access their zones
            if user.role == UserRole.ZONE_ADMIN:
                if user.zone_id != int(zone_id):
                    return jsonify({'error': 'Access denied to this zone'}), 403
                return f(*args, **kwargs)
            
            # Other roles need to be assigned to the zone
            if user.zone_id != int(zone_id):
                return jsonify({'error': 'Access denied to this zone'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def paginate_query(query, page=1, per_page=25):
    """Helper function to paginate SQLAlchemy queries"""
    pagination = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    return {
        'items': [item.to_dict() if hasattr(item, 'to_dict') else item for item in pagination.items],
        'meta': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    }

def safe_filename(filename):
    """Generate a safe filename with UUID prefix"""
    if not filename:
        return None
    
    # Get file extension
    _, ext = os.path.splitext(filename)
    
    # Generate UUID prefix
    uuid_prefix = str(uuid.uuid4())
    
    # Create safe filename
    safe_name = secure_filename(filename)
    if not safe_name:
        safe_name = f"file{ext}"
    
    return f"{uuid_prefix}-{safe_name}"

def ensure_prompts_dir():
    """Ensure the prompts directory exists"""
    from flask import current_app
    prompts_dir = current_app.config.get('PROMPTS_DIR', './prompts')
    os.makedirs(prompts_dir, exist_ok=True)
    return prompts_dir

def get_request_id():
    """Get or generate a request ID for tracing"""
    request_id = request.headers.get('X-Request-ID')
    if not request_id:
        request_id = str(uuid.uuid4())
    return request_id

def validate_date_range(start, end):
    """Validate date range for queries"""
    if start and end and start >= end:
        raise ValueError("Start date must be before end date")
    
    # Limit to reasonable range (e.g., 1 year)
    if start and end:
        from datetime import timedelta
        if end - start > timedelta(days=365):
            raise ValueError("Date range cannot exceed 1 year")
    
    return True 