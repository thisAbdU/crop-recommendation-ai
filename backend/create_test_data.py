#!/usr/bin/env python3
"""
Script to create test data for the crop recommendation system
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Zone, UserRole

def create_test_data():
    """Create test data for the system"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if data already exists
            existing_zones = Zone.query.all()
            existing_users = User.query.all()
            
            if existing_zones and existing_users:
                print("Test data already exists!")
                print(f"Zones: {[z.name for z in existing_zones]}")
                print(f"Users: {[u.first_name for u in existing_users]}")
                return
            
            # Create a test user
            test_user = User(
                first_name="Test",
                last_name="Farmer",
                role=UserRole.FARMER,
                email="test@example.com",
                phone_number="+1234567890"
            )
            db.session.add(test_user)
            db.session.flush()  # Get the user ID
            
            # Create a test zone
            test_zone = Zone(
                name="Test Farm Zone 1",
                latitude=40.7128,
                longitude=-74.0060,
                area_hectare=10.5,
                zone_admin_id=test_user.id
            )
            db.session.add(test_zone)
            db.session.flush()  # Get the zone ID
            
            # Update user with zone_id
            test_user.zone_id = test_zone.id
            
            # Commit all changes
            db.session.commit()
            
            print("✅ Test data created successfully!")
            print(f"User: {test_user.first_name} {test_user.last_name} (ID: {test_user.id})")
            print(f"Zone: {test_zone.name} (ID: {test_zone.id})")
            print(f"Zone assigned to user: {test_user.zone_id}")
            
        except Exception as e:
            print(f"❌ Error creating test data: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    create_test_data() 