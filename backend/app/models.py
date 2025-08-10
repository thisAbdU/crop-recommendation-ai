import enum
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import JSONB
from werkzeug.security import check_password_hash

class UserRole(enum.Enum):
    FARMER = 'farmer'
    TECHNICIAN = 'technician'
    ZONE_ADMIN = 'zone_admin'
    CENTRAL_ADMIN = 'central_admin'
    EXPORTER = 'exporter'

class IoTHealth(enum.Enum):
    OK = 'ok'
    WARNING = 'warning'
    OFFLINE = 'offline'
    MAINTENANCE = 'maintenance'

class RecommendationStatus(enum.Enum):
    PENDING = 'pending'
    GENERATED = 'generated'
    APPROVED = 'approved'
    DECLINED = 'declined'
    REGENERATED = 'regenerated'
    FAILED = 'failed'

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(128), nullable=False)
    last_name = db.Column(db.String(128), nullable=True)
    role = db.Column(db.Enum(UserRole), nullable=False)
    phone_number = db.Column(db.String(32), unique=True, nullable=True)
    email = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.Text, nullable=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=True)
    language = db.Column(db.String(8), nullable=True)
    received_recommendation = db.Column(db.Boolean, default=False)
    received_recommendation_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    zone = db.relationship('Zone', backref='zone_users', foreign_keys=[zone_id])
    assigned_iots = db.relationship('IoT', backref='assigned_technician', foreign_keys='IoT.assigned_to_technician_id')
    created_recommendations = db.relationship('Recommendation', backref='created_by_user', foreign_keys='Recommendation.created_by')
    approved_recommendations = db.relationship('Recommendation', backref='approved_by_user', foreign_keys='Recommendation.approved_by')
    prompt_templates = db.relationship('PromptTemplate', backref='owner')
    audit_logs = db.relationship('AuditLog', backref='user')

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role.value if self.role else None,
            "email": self.email,
            "phone_number": self.phone_number,
            "language": self.language
        }
    def check_password(self, password):
        """Verify a password against the stored hash."""
        return check_password_hash(self.password_hash, password)


class Zone(db.Model):
    __tablename__ = 'zones'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Numeric(10, 7), nullable=True)
    longitude = db.Column(db.Numeric(10, 7), nullable=True)
    area_hectare = db.Column(db.Numeric(10, 3), nullable=True)
    zone_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    zone_type = db.Column(db.String(64), nullable=True)
    # Relationships
    zone_admin = db.relationship('User', foreign_keys=[zone_admin_id], backref='administered_zones')
    iots = db.relationship('IoT', backref='zone', cascade='all, delete-orphan')
    land_conditions = db.relationship('ZoneLandCondition', backref='zone', cascade='all, delete-orphan')
    recommendations = db.relationship('Recommendation', backref='zone', cascade='all, delete-orphan')

class IoT(db.Model):
    __tablename__ = 'iots'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    tag_sn = db.Column(db.String(255), unique=True, nullable=False)
    health = db.Column(db.Enum(IoTHealth), nullable=False, default=IoTHealth.OK)
    assigned_to_technician_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=False)
    last_seen_at = db.Column(db.DateTime, nullable=True)
    device_metadata = db.Column(JSONB, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ZoneLandCondition(db.Model):
    __tablename__ = 'zone_land_condition'
    
    id = db.Column(db.BigInteger, primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=False)
    read_from_iot_at = db.Column(db.DateTime, nullable=False)
    is_from_iot = db.Column(db.Boolean, default=True)
    soil_moisture = db.Column(db.Float, nullable=True)
    ph = db.Column(db.Float, nullable=True)
    temperature = db.Column(db.Float, nullable=True)
    phosphorus = db.Column(db.Float, nullable=True)
    potassium = db.Column(db.Float, nullable=True)
    humidity = db.Column(db.Float, nullable=True)
    nitrogen = db.Column(db.Float, nullable=True)
    rainfall = db.Column(db.Float, nullable=True)
    soil_type = db.Column(db.String(64), nullable=True)
    device_tag = db.Column(db.String(255), nullable=True)
    wind_speed = db.Column(db.Float, nullable=True)
    pressure = db.Column(db.Float, nullable=True)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Recommendation(db.Model):
    __tablename__ = 'recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    generated_by = db.Column(db.String(64), default='ai')
    status = db.Column(db.Enum(RecommendationStatus), nullable=False, default=RecommendationStatus.PENDING)
    response = db.Column(db.Text, nullable=True)
    crops = db.Column(JSONB, nullable=True)
    data_used = db.Column(JSONB, nullable=True)
    prompt_template_id = db.Column(db.Integer, db.ForeignKey('prompt_templates.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    recommendation_data = db.Column(JSONB, nullable=True)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    data_start_date = db.Column(db.DateTime, nullable=True)
    data_end_date = db.Column(db.DateTime, nullable=True)
    ai_model_version = db.Column(db.String(64), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    # Relationships
    prompt_template = db.relationship('PromptTemplate', backref='recommendations')
    chat_threads = db.relationship('ChatThread', backref='recommendation', cascade='all, delete-orphan')

class ChatThread(db.Model):
    __tablename__ = 'chat_threads'
    
    id = db.Column(db.Integer, primary_key=True)
    recommendation_id = db.Column(db.Integer, db.ForeignKey('recommendations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='chat_threads')
    messages = db.relationship('ChatMessage', backref='thread', cascade='all, delete-orphan')

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    thread_id = db.Column(db.Integer, db.ForeignKey('chat_threads.id'), nullable=False)
    role = db.Column(db.String(16), nullable=False)  # user, assistant, system
    message_text = db.Column(db.Text, nullable=False)
    message_metadata = db.Column(JSONB, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PromptTemplate(db.Model):
    __tablename__ = 'prompt_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    language = db.Column(db.String(16), nullable=True)
    file_path = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    owner_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(255), nullable=False)
    object_type = db.Column(db.String(64), nullable=True)
    object_id = db.Column(db.Integer, nullable=True)
    meta = db.Column(JSONB, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 