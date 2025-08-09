import os
import hashlib
from flask import current_app
from jinja2 import Environment, FileSystemLoader, Template
import logging

logger = logging.getLogger(__name__)

class PromptService:
    """Service for managing and rendering prompt templates"""
    
    def __init__(self):
        self.prompts_dir = current_app.config.get('PROMPTS_DIR', './prompts')
        self.env = Environment(
            loader=FileSystemLoader(self.prompts_dir),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )
        self._template_cache = {}
        self._checksum_cache = {}
    
    def get_template(self, template_id):
        """Get template by ID"""
        from app.models import PromptTemplate
        
        template = PromptTemplate.query.get(template_id)
        if not template:
            raise ValueError(f"Template with ID {template_id} not found")
        
        if not template.is_active:
            raise ValueError(f"Template {template.name} is not active")
        
        return {
            'id': template.id,
            'name': template.name,
            'language': template.language,
            'file_path': template.file_path,
            'description': template.description,
            'is_active': template.is_active
        }
    
    def get_template_content(self, template_id):
        """Get template file content"""
        template_info = self.get_template(template_id)
        file_path = os.path.join(self.prompts_dir, template_info['file_path'])
        
        # Security check - prevent path traversal
        if not os.path.abspath(file_path).startswith(os.path.abspath(self.prompts_dir)):
            raise ValueError("Invalid template path")
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Template file not found: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return content
        except Exception as e:
            logger.error(f"Error reading template file {file_path}: {str(e)}")
            raise
    
    def render_template(self, template_id, context):
        """Render a template with given context"""
        try:
            template_info = self.get_template(template_id)
            file_path = os.path.join(self.prompts_dir, template_info['file_path'])
            
            # Check if template has changed
            current_checksum = self._get_file_checksum(file_path)
            cached_checksum = self._checksum_cache.get(template_id)
            
            if cached_checksum != current_checksum:
                # Template has changed, reload it
                self._template_cache.pop(template_id, None)
                self._checksum_cache[template_id] = current_checksum
            
            # Get template from cache or load it
            if template_id not in self._template_cache:
                template_content = self.get_template_content(template_id)
                self._template_cache[template_id] = Template(template_content)
            
            jinja_template = self._template_cache[template_id]
            return jinja_template.render(**context)
            
        except Exception as e:
            logger.error(f"Error rendering template {template_id}: {str(e)}")
            raise
    
    def render_template_from_content(self, template_content, context):
        """Render a template from content string"""
        try:
            template = Template(template_content)
            return template.render(**context)
        except Exception as e:
            logger.error(f"Error rendering template from content: {str(e)}")
            raise
    
    def list_templates(self, language=None, active_only=True):
        """List available templates"""
        from app.models import PromptTemplate
        
        query = PromptTemplate.query
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        if language:
            query = query.filter_by(language=language)
        
        templates = query.all()
        
        result = []
        for template in templates:
            template_info = {
                'id': template.id,
                'name': template.name,
                'language': template.language,
                'description': template.description,
                'is_active': template.is_active,
                'created_at': template.created_at.isoformat() if template.created_at else None
            }
            
            # Check if file exists
            file_path = os.path.join(self.prompts_dir, template.file_path)
            template_info['file_exists'] = os.path.exists(file_path)
            
            result.append(template_info)
        
        return result
    
    def validate_template(self, template_content):
        """Validate template syntax"""
        try:
            Template(template_content)
            return True, None
        except Exception as e:
            return False, str(e)
    
    def create_default_templates(self):
        """Create default prompt templates if they don't exist"""
        default_templates = [
            {
                'name': 'default_recommendation_template',
                'language': 'en',
                'description': 'Default template for crop recommendations',
                'content': self._get_default_recommendation_template()
            },
            {
                'name': 'default_chat_template',
                'language': 'en',
                'description': 'Default template for AI chat responses',
                'content': self._get_default_chat_template()
            }
        ]
        
        from app.models import PromptTemplate
        from app.utils import safe_filename
        
        for template_info in default_templates:
            # Check if template already exists
            existing = PromptTemplate.query.filter_by(name=template_info['name']).first()
            if existing:
                continue
            
            # Create file
            filename = safe_filename(f"{template_info['name']}.j2")
            file_path = os.path.join(self.prompts_dir, filename)
            
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(template_info['content'])
                
                # Create database record
                template = PromptTemplate(
                    name=template_info['name'],
                    language=template_info['language'],
                    file_path=filename,
                    description=template_info['description'],
                    is_active=True
                )
                
                from app import db
                db.session.add(template)
                db.session.commit()
                
                logger.info(f"Created default template: {template_info['name']}")
                
            except Exception as e:
                logger.error(f"Error creating default template {template_info['name']}: {str(e)}")
    
    def _get_file_checksum(self, file_path):
        """Get file checksum for change detection"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return None
    
    def _get_default_recommendation_template(self):
        """Get default recommendation template content"""
        return """# Crop Recommendation Analysis

## Zone Information
- Zone ID: {{ recommendation.zone_id }}
- Analysis Period: {{ recommendation.start_time }} to {{ recommendation.end_time }}

## Environmental Data Summary
{% if aggregated_features %}
- Average Soil Moisture: {{ "%.1f"|format(aggregated_features.soil_moisture|default(0)) }}%
- Average pH: {{ "%.1f"|format(aggregated_features.ph|default(0)) }}
- Average Temperature: {{ "%.1f"|format(aggregated_features.temperature|default(0)) }}°C
- Average Nitrogen: {{ "%.1f"|format(aggregated_features.nitrogen|default(0)) }} mg/kg
- Average Phosphorus: {{ "%.1f"|format(aggregated_features.phosphorus|default(0)) }} mg/kg
- Average Potassium: {{ "%.1f"|format(aggregated_features.potassium|default(0)) }} mg/kg
{% endif %}

## Soil Classification
- Soil Type: {{ soil_classification.soil_type|default('Unknown') }}
- Confidence: {{ "%.1f"|format(soil_classification.confidence|default(0) * 100) }}%

## Recommended Crops

{% for crop in crops %}
### {{ crop.crop_name }}
- **Suitability Score**: {{ crop.suitability_score }}%
- **Soil Type**: {{ crop.soil_type }}
- **Key Factors**:
  - pH Range: {{ crop.key_environmental_factors.ph_optimal }}
  - Moisture: {{ crop.key_environmental_factors.moisture_optimal }}
  - Temperature: {{ crop.key_environmental_factors.temperature_optimal }}

**Rationale**: {{ crop.rationale_text }}

{% endfor %}

## Similar Historical Examples
{% if similar_examples %}
Based on similar environmental conditions, the following historical examples were found:

{% for example in similar_examples %}
- Example {{ example.id }}: {{ example.crop_name }} (Similarity: {{ "%.1f"|format(example.similarity_score * 100) }}%)
{% endfor %}
{% endif %}

## Recommendations
1. Consider the soil type and environmental conditions when selecting crops
2. Monitor soil moisture and pH levels regularly
3. Adjust irrigation and fertilization based on crop requirements
4. Consider crop rotation for sustainable farming practices

---
*This analysis is based on IoT sensor data and AI-powered soil classification.*"""
    
    def _get_default_chat_template(self):
        """Get default chat template content"""
        return """You are an agricultural AI assistant helping users understand crop recommendations and soil analysis.

## Context
- User Role: {{ user_role }}
- Recommendation ID: {{ recommendation.id }}
- Zone ID: {{ recommendation.zone_id }}

## Recommendation Data
{% if recommendation.crops %}
**Recommended Crops:**
{% for crop in recommendation.crops %}
- {{ crop.crop_name }} ({{ crop.suitability_score }}% suitability)
{% endfor %}
{% endif %}

{% if recommendation.response %}
**Analysis Summary:**
{{ recommendation.response }}
{% endif %}

## User Question
{{ user_message }}

## Instructions
1. Answer the user's question based on the recommendation data
2. Provide specific, actionable advice when possible
3. Use simple, clear language appropriate for the user's role
4. If the question is outside the scope of this recommendation, politely redirect
5. Always be helpful and professional

## Response
Please provide a helpful response to the user's question about the crop recommendation.""" 