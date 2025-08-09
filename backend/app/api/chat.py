from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import ChatThread, ChatMessage, Recommendation, User, UserRole, RecommendationStatus
from app.schemas import ChatMessageSchema, ChatResponseSchema
from app.utils import require_role, audit_log
from app.services.prompt_service import PromptService
from app.services.ai_client import AIClient
from marshmallow import ValidationError
from datetime import datetime

chat_bp = Blueprint('chat', __name__)
chat_message_schema = ChatMessageSchema()
chat_response_schema = ChatResponseSchema()

@chat_bp.route('/recommendation/<int:recommendation_id>/message', methods=['POST'])
@jwt_required()
@require_role('exporter', 'zone_admin', 'central_admin', 'technician')
def send_chat_message(recommendation_id):
    """Send a chat message about a recommendation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Get recommendation
    recommendation = Recommendation.query.get(recommendation_id)
    if not recommendation:
        return jsonify({'error': 'Recommendation not found'}), 404
    
    # Check access permissions
    if current_user.role == UserRole.EXPORTER:
        # Exporters can only chat about approved recommendations
        if recommendation.status != RecommendationStatus.APPROVED:
            return jsonify({'error': 'Access denied'}), 403
    elif current_user.role == UserRole.ZONE_ADMIN:
        # Zone admins can chat about recommendations in their zones
        if recommendation.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    elif current_user.role == UserRole.TECHNICIAN:
        # Technicians can chat about recommendations in their zones
        if recommendation.zone_id != current_user.zone_id:
            return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = chat_message_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Get or create chat thread
    thread = ChatThread.query.filter_by(
        recommendation_id=recommendation_id,
        user_id=current_user_id
    ).first()
    
    if not thread:
        thread = ChatThread(
            recommendation_id=recommendation_id,
            user_id=current_user_id
        )
        db.session.add(thread)
        db.session.commit()
    
    # Save user message
    user_message = ChatMessage(
        thread_id=thread.id,
        role='user',
        message_text=data['message'],
        metadata={'model': data.get('model', 'local')}
    )
    db.session.add(user_message)
    db.session.commit()
    
    try:
        # Prepare context for AI
        context = {
            'recommendation': {
                'id': recommendation.id,
                'zone_id': recommendation.zone_id,
                'start_time': recommendation.start_time.isoformat() if recommendation.start_time else None,
                'end_time': recommendation.end_time.isoformat() if recommendation.end_time else None,
                'response': recommendation.response,
                'crops': recommendation.crops,
                'data_used': recommendation.data_used
            },
            'user_message': data['message'],
            'user_role': current_user.role.value,
            'model': data.get('model', 'local')
        }
        
        # Get prompt template if available
        prompt_template = None
        if recommendation.prompt_template_id:
            prompt_service = PromptService()
            prompt_template = prompt_service.get_template(recommendation.prompt_template_id)
        
        # Generate AI response
        ai_client = AIClient()
        ai_response = ai_client.chat_with_ai(context, prompt_template)
        
        # Save AI response
        assistant_message = ChatMessage(
            thread_id=thread.id,
            role='assistant',
            message_text=ai_response,
            metadata={'model': data.get('model', 'local')}
        )
        db.session.add(assistant_message)
        db.session.commit()
        
        # Audit log
        audit_log(current_user_id, 'chat_message_sent', 'chat_message', user_message.id, {
            'recommendation_id': recommendation_id,
            'thread_id': thread.id,
            'model': data.get('model', 'local')
        })
        
        return jsonify({
            'reply': ai_response,
            'thread_id': thread.id,
            'message_id': user_message.id
        }), 200
        
    except Exception as e:
        # Log error and return generic response
        error_message = "I'm sorry, I'm having trouble processing your request right now. Please try again later."
        
        assistant_message = ChatMessage(
            thread_id=thread.id,
            role='assistant',
            message_text=error_message,
            metadata={'model': data.get('model', 'local'), 'error': str(e)}
        )
        db.session.add(assistant_message)
        db.session.commit()
        
        return jsonify({
            'reply': error_message,
            'thread_id': thread.id,
            'message_id': user_message.id
        }), 200

@chat_bp.route('/threads/<int:thread_id>/messages', methods=['GET'])
@jwt_required()
def get_chat_messages(thread_id):
    """Get chat messages for a thread"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Get thread
    thread = ChatThread.query.get(thread_id)
    if not thread:
        return jsonify({'error': 'Chat thread not found'}), 404
    
    # Check access permissions
    if thread.user_id != current_user_id:
        # Check if user has access to the recommendation
        recommendation = Recommendation.query.get(thread.recommendation_id)
        if not recommendation:
            return jsonify({'error': 'Access denied'}), 403
        
        if current_user.role == UserRole.EXPORTER:
            if recommendation.status != RecommendationStatus.APPROVED:
                return jsonify({'error': 'Access denied'}), 403
        elif current_user.role == UserRole.ZONE_ADMIN:
            if recommendation.zone_id != current_user.zone_id:
                return jsonify({'error': 'Access denied'}), 403
        elif current_user.role == UserRole.TECHNICIAN:
            if recommendation.zone_id != current_user.zone_id:
                return jsonify({'error': 'Access denied'}), 403
        elif current_user.role != UserRole.CENTRAL_ADMIN:
            return jsonify({'error': 'Access denied'}), 403
    
    # Get messages
    messages = ChatMessage.query.filter_by(thread_id=thread_id).order_by(ChatMessage.created_at.asc()).all()
    
    messages_data = []
    for message in messages:
        messages_data.append({
            'id': message.id,
            'role': message.role,
            'message_text': message.message_text,
            'metadata': message.message_metadata,
            'created_at': message.created_at.isoformat() if message.created_at else None
        })
    
    return jsonify({
        'thread_id': thread_id,
        'recommendation_id': thread.recommendation_id,
        'messages': messages_data
    }), 200

@chat_bp.route('/threads', methods=['GET'])
@jwt_required()
def get_user_chat_threads():
    """Get chat threads for the current user"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Get threads for user
    threads = ChatThread.query.filter_by(user_id=current_user_id).order_by(ChatThread.created_at.desc()).all()
    
    threads_data = []
    for thread in threads:
        # Get recommendation info
        recommendation = Recommendation.query.get(thread.recommendation_id)
        if not recommendation:
            continue
        
        # Check access permissions
        if current_user.role == UserRole.EXPORTER:
            if recommendation.status != RecommendationStatus.APPROVED:
                continue
        elif current_user.role == UserRole.ZONE_ADMIN:
            if recommendation.zone_id != current_user.zone_id:
                continue
        elif current_user.role == UserRole.TECHNICIAN:
            if recommendation.zone_id != current_user.zone_id:
                continue
        
        # Get last message
        last_message = ChatMessage.query.filter_by(thread_id=thread.id).order_by(ChatMessage.created_at.desc()).first()
        
        threads_data.append({
            'id': thread.id,
            'recommendation_id': thread.recommendation_id,
            'created_at': thread.created_at.isoformat() if thread.created_at else None,
            'last_message': {
                'text': last_message.message_text[:100] + '...' if len(last_message.message_text) > 100 else last_message.message_text,
                'role': last_message.role,
                'created_at': last_message.created_at.isoformat() if last_message.created_at else None
            } if last_message else None,
            'recommendation': {
                'id': recommendation.id,
                'status': recommendation.status.value,
                'zone_id': recommendation.zone_id
            }
        })
    
    return jsonify({'threads': threads_data}), 200 