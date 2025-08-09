# Agritech Backend - Crop Recommendation AI

A production-ready Flask REST API for agricultural IoT data management and AI-powered crop suitability recommendations. The system ingests sensor data from IoT devices, fetches weather forecasts, and provides intelligent crop recommendations based on environmental and soil conditions.

## Features

- **IoT Data Ingestion**: Real-time sensor data collection from IoT devices
- **Weather Integration**: OpenWeather API integration for forecast data
- **AI-Powered Recommendations**: Crop suitability analysis using environmental and soil data
- **Role-Based Access Control**: Multi-role user system (central_admin, zone_admin, technician, farmer, exporter)
- **Background Processing**: Celery-based asynchronous task processing
- **Prompt Templates**: Jinja2-based template system for AI responses
- **Audit Logging**: Comprehensive audit trail for all system actions
- **Health Monitoring**: System health checks and metrics
- **Data Export**: CSV export functionality for zone data

## Tech Stack

- **Backend**: Flask 2.3.3
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with Flask-JWT-Extended
- **Background Jobs**: Celery with Redis
- **API Documentation**: Flask-Smorest
- **Validation**: Marshmallow schemas
- **AI Integration**: Mock implementation with extensible interface for agri_ai package
- **Deployment**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.10+ (for local development)
- PostgreSQL (for local development)
- Redis (for local development)

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/agri_db

# Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# OpenWeather API
OPENWEATHER_API_KEY=your-openweather-api-key

# AI Configuration
AI_MODE=local
AGRI_AI_MODEL_PATH=/srv/models/soil_classifier.joblib

# Application
PROMPTS_DIR=./prompts
ADMIN_EMAIL=admin@example.com
```

### Using Docker Compose (Recommended)

1. **Clone and setup**:
```bash
git clone <repository-url>
cd crop-recommendation-ai/backend
```

2. **Start services**:
```bash
docker-compose up -d
```

3. **Seed the database**:
```bash
docker-compose exec web python scripts/seed_db.py
```

4. **Access the application**:
- API: http://localhost:5000
- Celery Flower (monitoring): http://localhost:5555

### Local Development Setup

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Setup database**:
```bash
# Create PostgreSQL database
createdb agri_db

# Run migrations
flask db upgrade
```

3. **Seed database**:
```bash
python scripts/seed_db.py
```

4. **Start services**:
```bash
# Terminal 1: Flask app
flask run

# Terminal 2: Redis
redis-server

# Terminal 3: Celery worker
celery -A app.tasks.rec_tasks.celery worker --loglevel=info

# Terminal 4: Celery beat (scheduler)
celery -A app.tasks.rec_tasks.celery beat --loglevel=info
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (central_admin only)
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - List users (with role-based filtering)
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (central_admin only)

### Zones
- `GET /api/zones` - List zones (role-based access)
- `GET /api/zones/:id` - Get zone details
- `POST /api/zones` - Create zone (central_admin only)
- `PUT /api/zones/:id` - Update zone (central_admin only)
- `DELETE /api/zones/:id` - Delete zone (central_admin only)
- `GET /api/zones/:id/opportunities` - Get approved recommendations (exporters)

### IoT Devices
- `GET /api/iots` - List IoT devices
- `GET /api/iots/:id` - Get device details
- `POST /api/iots` - Create device
- `PUT /api/iots/:id` - Update device
- `DELETE /api/iots/:id` - Delete device
- `GET /api/iots/:id/health` - Get device health
- `GET /api/iots/health` - Get aggregated health status

### Sensor Data
- `POST /api/ingest/sensor` - Ingest sensor data (public endpoint)
- `GET /api/zones/:id/data` - Get zone sensor data
- `GET /api/zones/:id/data/export` - Export zone data as CSV
- `GET /api/zones/:id/data/summary` - Get data summary

### Recommendations
- `POST /api/zones/:id/recommend` - Trigger recommendation generation
- `GET /api/recommendations/:id` - Get recommendation details
- `POST /api/recommendations/:id/regenerate` - Regenerate recommendation
- `POST /api/recommendations/:id/approve` - Approve recommendation
- `POST /api/recommendations/:id/decline` - Decline recommendation
- `GET /api/recommendations` - List recommendations

### Chat
- `POST /api/chat/recommendation/:id/message` - Send chat message
- `GET /api/chat/threads/:id/messages` - Get chat messages
- `GET /api/chat/threads` - Get user chat threads

### Prompt Templates
- `GET /api/prompts` - List templates
- `POST /api/prompts` - Upload template (central_admin only)
- `GET /api/prompts/:id` - Get template details
- `GET /api/prompts/:id/content` - Get template content (central_admin only)
- `PUT /api/prompts/:id` - Update template (central_admin only)
- `DELETE /api/prompts/:id` - Delete template (central_admin only)

### Health & Monitoring
- `GET /api/health` - System health check
- `GET /api/metrics` - System metrics
- `GET /api/iots/health` - IoT health status

## Demo Credentials

After running the seed script, you can use these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Central Admin | admin@example.com | password123 |
| Zone Admin | zoneadmin@example.com | password123 |
| Technician | tech@example.com | password123 |
| Farmer | farmer@example.com | password123 |
| Exporter | exporter@example.com | password123 |

## Usage Examples

### 1. Login and Get Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "zoneadmin@example.com", "password": "password123"}'
```

### 2. Trigger Recommendation
```bash
curl -X POST http://localhost:5000/api/zones/1/recommend \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-07T23:59:59Z"
  }'
```

### 3. Ingest Sensor Data
```bash
curl -X POST http://localhost:5000/api/ingest/sensor \
  -H "Content-Type: application/json" \
  -d '{
    "tag_sn": "MAIN-001",
    "zone_id": 1,
    "read_from_iot_at": "2024-01-15T10:30:00Z",
    "soil_moisture": 25.5,
    "ph": 6.2,
    "temperature": 28.3,
    "phosphorus": 15.2,
    "potassium": 180.5,
    "humidity": 65.0,
    "nitrogen": 35.8
  }'
```

### 4. Get Zone Data
```bash
curl -X GET "http://localhost:5000/api/zones/1/data?start=2024-01-01T00:00:00Z&end=2024-01-07T23:59:59Z&agg=mean" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Background Tasks

The system uses Celery for background processing:

- **Recommendation Generation**: AI-powered crop suitability analysis
- **Weather Data Fetching**: Periodic OpenWeather API calls
- **Data Cleanup**: Automatic cleanup of old sensor data and audit logs
- **Health Checks**: Periodic system health monitoring

### Monitoring

Access Celery Flower at http://localhost:5555 to monitor background tasks.

## AI Integration

The system is designed to work with an external `agri_ai` package that provides:

- Soil classification
- Crop recommendation generation
- Similar example search
- AI chat responses

When the `agri_ai` package is not available, the system uses mock implementations for development and testing.

## Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── config.py            # Configuration classes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Marshmallow schemas
│   ├── utils.py             # Utility functions
│   ├── api/                 # API blueprints
│   ├── services/            # Business logic services
│   └── tasks/               # Celery tasks
├── scripts/
│   └── seed_db.py          # Database seeding
├── tests/                   # Test files
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

### Running Tests
```bash
pytest tests/
```

### Code Style
The project follows PEP 8 style guidelines. Use a linter like `flake8` or `black` for code formatting.

## Production Deployment

### Environment Variables
Set all required environment variables in production:
- Use strong, unique secret keys
- Configure production database URL
- Set up proper Redis configuration
- Configure OpenWeather API key
- Set up proper logging and monitoring

### Security Considerations
- Use HTTPS in production
- Implement proper rate limiting
- Secure database connections
- Use environment variables for secrets
- Implement proper backup strategies

### Scaling
- Use multiple Celery workers
- Consider database connection pooling
- Implement caching strategies
- Use load balancers for high availability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team. 