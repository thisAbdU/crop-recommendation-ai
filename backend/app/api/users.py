from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_smorest import Blueprint as SmorestBlueprint, abort
from app import db
from app.models import User, UserRole
from app.schemas import UserSchema, UserResponseSchema, PaginationSchema
from app.utils import require_role, audit_log, paginate_query
from marshmallow import ValidationError
from sqlalchemy import or_

# Create Flask-Smorest blueprint
blp = SmorestBlueprint('users', __name__, description='User management endpoints')

# Keep the old blueprint for backward compatibility
users_bp = Blueprint('users', __name__)

user_schema = UserSchema()
user_response_schema = UserResponseSchema()
pagination_schema = PaginationSchema()

@blp.route('/', methods=['GET'])
@blp.response(200, description="Users retrieved successfully")
@blp.response(400, description="Invalid pagination parameters")
@blp.response(401, description="Unauthorized - JWT token required")
@blp.doc(
    summary="Get Users",
    description="Get users with filtering and pagination. Role-based access control applies."
)
@jwt_required()
@require_role('central_admin', 'zone_admin')
def get_users():
    """Get users with filtering and pagination"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Parse query parameters
    try:
        pagination_data = pagination_schema.load(request.args)
    except ValidationError as err:
        abort(400, message="Invalid pagination parameters", errors=err.messages)
    
    # Build query
    query = User.query
    
    # Role-based filtering
    if current_user.role == UserRole.ZONE_ADMIN:
        # Zone admins can only see users in their zone
        query = query.filter_by(zone_id=current_user.zone_id)
    else:
        # Central admin can filter by role and zone
        role_filter = request.args.get('role')
        zone_filter = request.args.get('zone_id')
        
        if role_filter:
            try:
                role_enum = UserRole(role_filter)
                query = query.filter_by(role=role_enum)
            except ValueError:
                abort(400, message="Invalid role")
        
        if zone_filter:
            query = query.filter_by(zone_id=int(zone_filter))
    
    # Search by name or email
    search = request.args.get('search')
    if search:
        query = query.filter(
            or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    # Paginate results
    result = paginate_query(
        query, 
        page=pagination_data['page'], 
        per_page=pagination_data['per_page']
    )
    
    return result

@blp.route('/<int:user_id>', methods=['GET'])
@blp.response(200, UserSchema, description="User details retrieved successfully")
@blp.response(401, description="Unauthorized - JWT token required")
@blp.response(403, description="Access denied")
@blp.response(404, description="User not found")
@blp.doc(
    summary="Get User Details",
    description="Get specific user details. Access is controlled by user role and zone."
)
@jwt_required()
@require_role('central_admin', 'zone_admin')
def get_user(user_id):
    """Get specific user details"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    user = User.query.get(user_id)
    if not user:
        abort(404, message="User not found")
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if user.zone_id != current_user.zone_id:
            abort(403, message="Access denied")
    
    return user.to_dict()

@blp.route('/', methods=['POST'])
@blp.arguments(UserSchema, location='json')
@blp.response(201, UserSchema, description="User created successfully")
@blp.response(400, description="Validation error")
@blp.response(401, description="Unauthorized - JWT token required")
@blp.response(403, description="Access denied - insufficient permissions")
@blp.response(409, description="User already exists")
@blp.doc(
    summary="Create User",
    description="Create a new user. Role-based restrictions apply to what types of users can be created."
)
@jwt_required()
@require_role('central_admin', 'zone_admin')
def create_user(args):
    """Create a new user"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Role restrictions for zone admins
    if current_user.role == UserRole.ZONE_ADMIN:
        # Zone admins can only create farmers and technicians in their zone
        if args['role'] not in [UserRole.FARMER, UserRole.TECHNICIAN]:
            abort(403, message="Zone admins can only create farmers and technicians")
        
        # Force zone_id to be the admin's zone
        args['zone_id'] = current_user.zone_id
    
    # Check for existing user
    if args.get('email') and User.query.filter_by(email=args['email']).first():
        abort(409, message="Email already registered")
    
    if args.get('phone_number') and User.query.filter_by(phone_number=args['phone_number']).first():
        abort(409, message="Phone number already registered")
    
    # Create user
    user = User(
        first_name=args['first_name'],
        last_name=args.get('last_name'),
        role=args['role'],
        email=args.get('email'),
        phone_number=args.get('phone_number'),
        zone_id=args.get('zone_id'),
        language=args.get('language')
    )
    
    if args.get('password'):
        user.set_password(args['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Audit log
    audit_log(current_user_id, 'user_created', 'user', user.id, {
        'created_user_role': user.role.value,
        'created_user_zone': user.zone_id
    })
    
    return user.to_dict(), 201 