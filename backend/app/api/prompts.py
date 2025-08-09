from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import PromptTemplate, User, UserRole
from app.schemas import PromptTemplateSchema, PaginationSchema
from app.utils import require_role, audit_log, paginate_query, safe_filename, ensure_prompts_dir
from marshmallow import ValidationError
import os
from werkzeug.utils import secure_filename

prompts_bp = Blueprint('prompts', __name__)
prompt_template_schema = PromptTemplateSchema()
pagination_schema = PaginationSchema()

@prompts_bp.route('/', methods=['GET'])
@jwt_required()
@require_role('central_admin', 'zone_admin')
def get_prompts():
    """Get prompt templates with filtering and pagination"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Parse pagination
    try:
        pagination_data = pagination_schema.load(request.args)
    except ValidationError as err:
        return jsonify({'error': 'Invalid pagination parameters', 'details': err.messages}), 400
    
    # Build query
    query = PromptTemplate.query
    
    # Zone admins can only see templates they own or active ones
    if current_user.role == UserRole.ZONE_ADMIN:
        query = query.filter(
            db.or_(
                PromptTemplate.owner_user_id == current_user_id,
                PromptTemplate.is_active == True
            )
        )
    
    # Filter by language
    language_filter = request.args.get('language')
    if language_filter:
        query = query.filter_by(language=language_filter)
    
    # Filter by active status
    active_filter = request.args.get('is_active')
    if active_filter is not None:
        is_active = active_filter.lower() == 'true'
        query = query.filter_by(is_active=is_active)
    
    # Search by name
    search = request.args.get('search')
    if search:
        query = query.filter(PromptTemplate.name.ilike(f'%{search}%'))
    
    # Paginate results
    result = paginate_query(
        query.order_by(PromptTemplate.created_at.desc()),
        page=pagination_data['page'],
        per_page=pagination_data['per_page']
    )
    
    return jsonify(result), 200

@prompts_bp.route('/<int:prompt_id>', methods=['GET'])
@jwt_required()
@require_role('central_admin', 'zone_admin')
def get_prompt(prompt_id):
    """Get specific prompt template details"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    prompt = PromptTemplate.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt template not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.ZONE_ADMIN:
        if prompt.owner_user_id != current_user_id and not prompt.is_active:
            return jsonify({'error': 'Access denied'}), 403
    
    prompt_data = prompt_template_schema.dump(prompt)
    
    # Add owner info
    if prompt.owner:
        prompt_data['owner'] = {
            'id': prompt.owner.id,
            'first_name': prompt.owner.first_name,
            'last_name': prompt.owner.last_name
        }
    
    return jsonify(prompt_data), 200

@prompts_bp.route('/<int:prompt_id>/content', methods=['GET'])
@jwt_required()
@require_role('central_admin')
def get_prompt_content(prompt_id):
    """Get prompt template file content - central_admin only"""
    prompt = PromptTemplate.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt template not found'}), 404
    
    # Ensure prompts directory exists
    prompts_dir = ensure_prompts_dir()
    
    # Build full file path
    file_path = os.path.join(prompts_dir, prompt.file_path)
    
    # Security check - prevent path traversal
    if not os.path.abspath(file_path).startswith(os.path.abspath(prompts_dir)):
        return jsonify({'error': 'Access denied'}), 403
    
    # Check if file exists
    if not os.path.exists(file_path):
        return jsonify({'error': 'Template file not found'}), 404
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return jsonify({
            'id': prompt.id,
            'name': prompt.name,
            'content': content,
            'file_path': prompt.file_path
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error reading file: {str(e)}'}), 500

@prompts_bp.route('/', methods=['POST'])
@jwt_required()
@require_role('central_admin')
def create_prompt():
    """Create a new prompt template - central_admin only"""
    current_user_id = get_jwt_identity()
    
    # Check if file was uploaded
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file type
    if not file.filename.endswith('.j2'):
        return jsonify({'error': 'Only .j2 files are allowed'}), 400
    
    # Get form data
    name = request.form.get('name')
    language = request.form.get('language')
    description = request.form.get('description')
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Check if template with same name exists
    if PromptTemplate.query.filter_by(name=name).first():
        return jsonify({'error': 'Template with this name already exists'}), 409
    
    # Ensure prompts directory exists
    prompts_dir = ensure_prompts_dir()
    
    # Generate safe filename
    safe_name = safe_filename(file.filename)
    
    # Save file
    file_path = os.path.join(prompts_dir, safe_name)
    file.save(file_path)
    
    # Create database record
    prompt = PromptTemplate(
        name=name,
        language=language,
        file_path=safe_name,
        description=description,
        owner_user_id=current_user_id,
        is_active=True
    )
    
    db.session.add(prompt)
    db.session.commit()
    
    # Audit log
    audit_log(current_user_id, 'prompt_template_created', 'prompt_template', prompt.id, {
        'name': name,
        'file_path': safe_name
    })
    
    return jsonify(prompt_template_schema.dump(prompt)), 201

@prompts_bp.route('/<int:prompt_id>', methods=['PUT'])
@jwt_required()
@require_role('central_admin')
def update_prompt(prompt_id):
    """Update prompt template metadata - central_admin only"""
    prompt = PromptTemplate.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt template not found'}), 404
    
    try:
        data = prompt_template_schema.load(request.get_json(), partial=True)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Update fields
    for field, value in data.items():
        if field != 'file_path' and hasattr(prompt, field):
            setattr(prompt, field, value)
    
    db.session.commit()
    
    # Audit log
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'prompt_template_updated', 'prompt_template', prompt.id)
    
    return jsonify(prompt_template_schema.dump(prompt)), 200

@prompts_bp.route('/<int:prompt_id>', methods=['DELETE'])
@jwt_required()
@require_role('central_admin')
def delete_prompt(prompt_id):
    """Delete prompt template - central_admin only"""
    prompt = PromptTemplate.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt template not found'}), 404
    
    # Ensure prompts directory exists
    prompts_dir = ensure_prompts_dir()
    
    # Build full file path
    file_path = os.path.join(prompts_dir, prompt.file_path)
    
    # Security check - prevent path traversal
    if not os.path.abspath(file_path).startswith(os.path.abspath(prompts_dir)):
        return jsonify({'error': 'Access denied'}), 403
    
    # Store prompt info for audit log
    prompt_info = prompt_template_schema.dump(prompt)
    
    # Delete file if it exists
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            return jsonify({'error': f'Error deleting file: {str(e)}'}), 500
    
    # Delete database record
    db.session.delete(prompt)
    db.session.commit()
    
    # Audit log
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'prompt_template_deleted', 'prompt_template', prompt_id, prompt_info)
    
    return jsonify({'message': 'Prompt template deleted successfully'}), 200

@prompts_bp.route('/<int:prompt_id>/activate', methods=['POST'])
@jwt_required()
@require_role('central_admin')
def activate_prompt(prompt_id):
    """Activate a prompt template - central_admin only"""
    prompt = PromptTemplate.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt template not found'}), 404
    
    prompt.is_active = True
    db.session.commit()
    
    # Audit log
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'prompt_template_activated', 'prompt_template', prompt.id)
    
    return jsonify({'message': 'Prompt template activated successfully'}), 200

@prompts_bp.route('/<int:prompt_id>/deactivate', methods=['POST'])
@jwt_required()
@require_role('central_admin')
def deactivate_prompt(prompt_id):
    """Deactivate a prompt template - central_admin only"""
    prompt = PromptTemplate.query.get(prompt_id)
    if not prompt:
        return jsonify({'error': 'Prompt template not found'}), 404
    
    prompt.is_active = False
    db.session.commit()
    
    # Audit log
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'prompt_template_deactivated', 'prompt_template', prompt.id)
    
    return jsonify({'message': 'Prompt template deactivated successfully'}), 200 