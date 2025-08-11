from flask import Blueprint, request, jsonify, current_app
from app.services.prompt_service import PromptService
from app.services.ai_client import AIClient
from app.services.crop_chat_service import CropChatService
from datetime import datetime

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/test', methods=['GET'])
def test_chat_endpoint():
    """Simple test endpoint to verify chat blueprint is working"""
    return jsonify({
        'message': 'Chat blueprint is working!',
        'status': 'success',
        'timestamp': datetime.now().isoformat()
    }), 200

@chat_bp.route('/health', methods=['GET'])
def chat_health():
    """Health check for chat service"""
    return jsonify({
        'service': 'chat',
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }), 200

@chat_bp.route('/recommendation/<int:recommendation_id>/message', methods=['POST'])
def send_chat_message(recommendation_id):
    """Send a chat message about a specific crop recommendation"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        user_message = data.get('message', '')
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Initialize services inside the route
        crop_chat_service = CropChatService()
        
        # Use the recommendation chat service
        chat_result = crop_chat_service.chat_about_crop_recommendation(
            recommendation_id=recommendation_id,
            user_message=user_message,
            user_id=None,  # No user ID for public access
            user_role='public'  # Public role
        )
        
        if 'error' in chat_result:
            return jsonify({'error': chat_result['error']}), 500
        
        return jsonify({
            'reply': chat_result['reply'],
            'thread_id': chat_result.get('thread_id'),
            'recommendation_id': recommendation_id,
            'zone_id': chat_result.get('zone_id'),
            'zone_name': chat_result.get('zone_name'),
            'crops': chat_result.get('crops'),
            'context_used': chat_result.get('context_used')
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error processing recommendation chat: {str(e)}")
        return jsonify({'error': 'Failed to process recommendation chat'}), 500

@chat_bp.route('/ai/status', methods=['GET'])
def get_ai_status():
    """Get AI service status and capabilities"""
    try:
        # Initialize services inside the route
        ai_client = AIClient()
        prompt_service = PromptService()
        
        # Test AI connection
        ai_status = ai_client.test_connection()
        
        # Get available prompt templates
        try:
            templates = prompt_service.list_templates()
            prompt_status = "healthy"
        except Exception as e:
            current_app.logger.warning(f"Prompt service error: {str(e)}")
            prompt_status = "degraded"
            templates = []
        
        return jsonify({
            'ai_service': ai_status,
            'prompt_service': prompt_status,
            'available_templates': len(templates),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error checking AI status: {str(e)}")
        return jsonify({'error': 'Failed to check AI status'}), 500

@chat_bp.route('/ai/test', methods=['POST'])
def test_ai_chat():
    """Test AI chat functionality"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        test_message = data.get('message', 'Hello, how can you help with agriculture?')
        
        # Initialize services inside the route
        ai_client = AIClient()
        prompt_service = PromptService()
        
        # Get a test prompt template
        try:
            templates = prompt_service.list_templates()
            if templates:
                template = templates[0]  # Use first available template
                prompt_content = prompt_service.get_template_content(template['id'])
            else:
                # Fallback to a simple prompt
                prompt_content = "You are an agricultural AI assistant. Please respond to: {{ message }}"
        except Exception as e:
            current_app.logger.warning(f"Using fallback prompt: {str(e)}")
            prompt_content = "You are an agricultural AI assistant. Please respond to: {{ message }}"
        
        # Test AI response
        context = {'message': test_message}
        ai_response = ai_client.chat_with_ai(context, prompt_content)
        
        return jsonify({
            'test_message': test_message,
            'ai_response': ai_response,
            'prompt_used': prompt_content,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error testing AI chat: {str(e)}")
        return jsonify({'error': 'Failed to test AI chat'}), 500

@chat_bp.route('/zone/<int:zone_id>/chat', methods=['POST'])
def zone_chat(zone_id):
    """Chat about zone-specific agricultural topics"""
    # Initialize services inside the route
    crop_chat_service = CropChatService()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        user_message = data.get('message', '')
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Use the zone chat service
        chat_result = crop_chat_service.chat_about_zone_crops(
            zone_id=zone_id,
            user_message=user_message,
            user_id=None,  # No user ID for public access
            user_role='public'  # Public role
        )
        
        if 'error' in chat_result:
            return jsonify({'error': chat_result['error']}), 500
        
        return jsonify({
            'reply': chat_result['reply'],
            'thread_id': chat_result['thread_id'],
            'zone_id': zone_id,
            'context_used': chat_result['context_used']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error processing zone chat: {str(e)}")
        return jsonify({'error': 'Failed to process zone chat'}), 500

@chat_bp.route('/public/test', methods=['POST'])
def test_public_chat():
    """Public test endpoint for chat functionality - no authentication required"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        test_message = data.get('message', 'Tell me about crop management')
        
        # Initialize services inside the route
        ai_client = AIClient()
        
        # Simple test response
        test_response = f"AI Service Test: Received message '{test_message}'. This is a test response to verify the chat service is working."
        
        return jsonify({
            'message': 'Public chat test successful',
            'test_message': test_message,
            'response': test_response,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in public chat test: {str(e)}")
        return jsonify({'error': 'Failed to process test message'}), 500 