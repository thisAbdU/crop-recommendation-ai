from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_smorest import Api
import os
from datetime import timedelta

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    if config_name == 'development':
        app.config.from_object('app.config.DevelopmentConfig')
    elif config_name == 'production':
        app.config.from_object('app.config.ProductionConfig')
    elif config_name == 'testing':
        app.config.from_object('app.config.TestingConfig')
    else:
        app.config.from_object('app.config.DevelopmentConfig')
    
    # Set Flask-Smorest configuration directly
    app.config['API_TITLE'] = "Crop Recommendation AI API"
    app.config['API_VERSION'] = "v1"
    app.config['OPENAPI_VERSION'] = "3.0.2"
    app.config['OPENAPI_URL_PREFIX'] = "/"
    app.config['OPENAPI_SWAGGER_UI_PATH'] = "/swagger-ui"
    app.config['OPENAPI_SWAGGER_UI_URL'] = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Initialize API with configuration (no constructor parameters)
    api = Api()
    api.init_app(app)
    
    # Register blueprints
    from app.api.auth import auth_bp, blp as auth_blp
    from app.api.users import users_bp, blp as users_blp
    from app.api.zones import zones_bp
    from app.api.iot import iot_bp
    from app.api.data import data_bp
    from app.api.recommendations import recommendations_bp, blp as recommendations_blp
    from app.api.chat import chat_bp
    from app.api.prompts import prompts_bp
    from app.api.health import health_bp, blp as health_blp
    
    # Register Flask-Smorest blueprints
    api.register_blueprint(auth_blp, url_prefix='/api/auth')
    api.register_blueprint(health_blp, url_prefix='/api')
    api.register_blueprint(users_blp, url_prefix='/api/users')
    api.register_blueprint(recommendations_blp, url_prefix='/api/recommendations')
    
    # Register regular blueprints for other endpoints
    app.register_blueprint(zones_bp, url_prefix='/api/zones')
    app.register_blueprint(iot_bp, url_prefix='/api/iots')
    app.register_blueprint(data_bp, url_prefix='/api')
    app.register_blueprint(recommendations_bp, url_prefix='/api/recommendations')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(prompts_bp, url_prefix='/api/prompts')
    
    # Add root route
    @app.route('/')
    def root():
        return {
            'message': 'Crop Recommendation AI API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'health': '/api/health',
                'auth': '/api/auth',
                'users': '/api/users',
                'zones': '/api/zones',
                'iot': '/api/iots',
                'recommendations': '/api/recommendations',
                'chat': '/api/chat',
                'prompts': '/api/prompts'
            }
        }, 200
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    return app

# Create the WSGI application for gunicorn
app = create_app() 