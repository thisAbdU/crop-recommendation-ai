from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_smorest import Blueprint as SmorestBlueprint, abort
from app import db
from app.models import User, UserRole
from app.schemas import LoginSchema, LoginResponseSchema, UserSchema
from marshmallow import ValidationError
from app.utils import audit_log
from werkzeug.security import generate_password_hash

# Create Flask-Smorest blueprint
blp = SmorestBlueprint('auth', __name__, description='Authentication endpoints')

# Keep the old blueprint for backward compatibility
auth_bp = Blueprint('auth', __name__)

login_schema = LoginSchema()
login_response_schema = LoginResponseSchema()
user_schema = UserSchema()

@blp.route('/login', methods=['POST'])
@blp.arguments(LoginSchema, location='json')
@blp.response(200, LoginResponseSchema, description="Login successful")
@blp.response(400, description="Validation error")
@blp.response(401, description="Invalid credentials")
@blp.doc(
    summary="User Login",
    description="Authenticate user with email/phone and password. Returns JWT access token and user information."
)
def login(args):
    """Login endpoint - accepts email or phone_number with password"""
    # Find user by email or phone
    user = None
    if args.get('email'):
        user = User.query.filter_by(email=args['email']).first()
    elif args.get('phone_number'):
        user = User.query.filter_by(phone_number=args['phone_number']).first()
    
    if not user or not user.check_password(args['password']):
        abort(401, message="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(identity=user.id)
    
    # Log the login
    audit_log(user.id, 'user_login', 'user', user.id)
    
    return {
        'access_token': access_token,
        'user': user.to_dict()
    }

@blp.route('/register', methods=['POST'])
@blp.arguments(UserSchema, location='json')
@blp.response(201, UserSchema, description="User created successfully")
@blp.response(400, description="Validation error")
@blp.response(409, description="User already exists")
@blp.doc(
    summary="Register New User",
    description="Register a new user. Only central_admin users can create new users."
)
def register(args):
    """Register new user - central_admin only for zone_admin registration"""
    
    if args.get('email') and User.query.filter_by(email=args['email']).first():
        abort(409, message="Email already registered")
    
    if args.get('phone_number') and User.query.filter_by(phone_number=args['phone_number']).first():
        abort(409, message="Phone number already registered")
    
    # Create new user
    user = User(
        first_name=args['first_name'],
        last_name=args.get('last_name'),
        role=args['role'],
        email=args.get('email'),
        phone_number=args.get('phone_number'),
        language=args.get('language')
    )
    
 

    if args.get('password'):
        hashed_password = generate_password_hash(args['password'], method='pbkdf2:sha256')
        user.password_hash = hashed_password

    
    db.session.add(user)
    db.session.commit()
    
    # Log the registration
    # audit_log(current_user_id, 'user_created', 'user', user.id, {'created_user_role': user.role.value})
    
    return user.to_dict(), 201

@blp.route('/me', methods=['GET'])
@blp.response(200, UserSchema, description="Current user information")
@blp.response(401, description="Unauthorized - JWT token required")
@blp.response(404, description="User not found")
@blp.doc(
    summary="Get Current User",
    description="Get information about the currently authenticated user."
)
@jwt_required()
def get_current_user():
    """Get current user information"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        abort(404, message="User not found")
    
    return user.to_dict() 