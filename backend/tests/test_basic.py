import pytest
from app import create_app, db
from app.models import User, UserRole

@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Create test runner"""
    return app.test_cli_runner()

def test_app_creation(app):
    """Test that the app can be created"""
    assert app is not None
    assert app.config['TESTING'] is True

def test_database_connection(app):
    """Test database connection"""
    with app.app_context():
        # Test that we can execute a simple query
        result = db.session.execute('SELECT 1').scalar()
        assert result == 1

def test_user_creation(app):
    """Test user creation and password hashing"""
    with app.app_context():
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            role=UserRole.FARMER
        )
        user.set_password("password123")
        
        db.session.add(user)
        db.session.commit()
        
        # Verify password hashing
        assert user.check_password("password123") is True
        assert user.check_password("wrongpassword") is False
        
        # Verify user data
        assert user.first_name == "Test"
        assert user.role == UserRole.FARMER

def test_health_endpoint(client):
    """Test health check endpoint"""
    response = client.get('/api/health')
    assert response.status_code == 200
    
    data = response.get_json()
    assert 'status' in data
    assert 'services' in data

def test_auth_login_missing_credentials(client):
    """Test login endpoint with missing credentials"""
    response = client.post('/api/auth/login', json={})
    assert response.status_code == 400

def test_auth_login_invalid_credentials(client):
    """Test login endpoint with invalid credentials"""
    response = client.post('/api/auth/login', json={
        'email': 'nonexistent@example.com',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401 