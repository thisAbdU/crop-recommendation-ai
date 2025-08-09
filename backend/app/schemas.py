from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime
from app.models import UserRole, IoTHealth, RecommendationStatus

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    first_name = fields.Str(required=True, validate=validate.Length(max=128))
    last_name = fields.Str(validate=validate.Length(max=128))
    role = fields.Enum(UserRole, required=True)
    phone_number = fields.Str(validate=validate.Length(max=32))
    email = fields.Email()
    password = fields.Str(load_only=True, validate=validate.Length(min=6))
    zone_id = fields.Int()
    language = fields.Str(validate=validate.Length(max=8))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class UserResponseSchema(Schema):
    id = fields.Int()
    first_name = fields.Str()
    last_name = fields.Str()
    role = fields.Str()
    email = fields.Str()
    phone_number = fields.Str()
    zone_id = fields.Int()
    language = fields.Str()

class ZoneSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(max=255))
    latitude = fields.Decimal(places=7)
    longitude = fields.Decimal(places=7)
    area_hectare = fields.Decimal(places=3)
    zone_admin_id = fields.Int()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class IoTSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(max=255))
    tag_sn = fields.Str(required=True, validate=validate.Length(max=255))
    health = fields.Enum(IoTHealth, default=IoTHealth.OK)
    assigned_to_technician_id = fields.Int()
    zone_id = fields.Int(required=True)
    last_seen_at = fields.DateTime()
    device_metadata = fields.Dict()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class ZoneLandConditionSchema(Schema):
    id = fields.Int(dump_only=True)
    zone_id = fields.Int(required=True)
    read_from_iot_at = fields.DateTime(required=True)
    is_from_iot = fields.Bool(default=True)
    soil_moisture = fields.Float()
    ph = fields.Float()
    temperature = fields.Float()
    phosphorus = fields.Float()
    potassium = fields.Float()
    humidity = fields.Float()
    nitrogen = fields.Float()
    rainfall = fields.Float()
    soil_type = fields.Str(validate=validate.Length(max=64))
    device_tag = fields.Str(validate=validate.Length(max=255))
    created_at = fields.DateTime(dump_only=True)

class SensorIngestSchema(Schema):
    tag_sn = fields.Str(required=True)
    zone_id = fields.Int(required=True)
    read_from_iot_at = fields.DateTime(required=True)
    soil_moisture = fields.Float()
    ph = fields.Float()
    temperature = fields.Float()
    phosphorus = fields.Float()
    potassium = fields.Float()
    humidity = fields.Float()
    nitrogen = fields.Float()

class RecommendationSchema(Schema):
    id = fields.Int(dump_only=True)
    zone_id = fields.Int(required=True)
    start_time = fields.DateTime()
    end_time = fields.DateTime()
    generated_by = fields.Str(default='ai')
    status = fields.Enum(RecommendationStatus, default=RecommendationStatus.PENDING)
    response = fields.Str()
    crops = fields.Dict()
    data_used = fields.Dict()
    prompt_template_id = fields.Int()
    created_by = fields.Int()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    approved_by = fields.Int()
    approved_at = fields.DateTime()

class RecommendationRequestSchema(Schema):
    start = fields.DateTime(required=True)
    end = fields.DateTime(required=True)
    prompt_template_id = fields.Int()

class ChatMessageSchema(Schema):
    message = fields.Str(required=True)
    model = fields.Str(validate=validate.OneOf(['local', 'openai']), default='local')

class ChatResponseSchema(Schema):
    reply = fields.Str()
    thread_id = fields.Int()

class PromptTemplateSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(max=255))
    language = fields.Str(validate=validate.Length(max=16))
    file_path = fields.Str(dump_only=True)
    description = fields.Str()
    owner_user_id = fields.Int()
    is_active = fields.Bool(default=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class LoginSchema(Schema):
    email = fields.Email()
    phone_number = fields.Str()
    password = fields.Str(required=True)
    
    def validate(self, data, **kwargs):
        if not data.get('email') and not data.get('phone_number'):
            raise ValidationError('Either email or phone_number is required')
        return data

class LoginResponseSchema(Schema):
    access_token = fields.Str()
    user = fields.Nested(UserResponseSchema)

class PaginationSchema(Schema):
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    per_page = fields.Int(missing=25, validate=validate.Range(min=1, max=100))

class DataQuerySchema(PaginationSchema):
    start = fields.DateTime(required=True)
    end = fields.DateTime(required=True)
    agg = fields.Str(validate=validate.OneOf(['mean', 'median', 'raw']), missing='raw')
    granularity = fields.Str(validate=validate.OneOf(['hour', 'day']), missing='hour')

class AuditLogSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int()
    action = fields.Str(required=True, validate=validate.Length(max=255))
    object_type = fields.Str(validate=validate.Length(max=64))
    object_id = fields.Int()
    meta = fields.Dict()
    created_at = fields.DateTime(dump_only=True) 