#!/usr/bin/env python3
"""
Script to check database status and existing data
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_database():
    """Check database connection and data"""
    try:
        from app import create_app, db
        from app.models import User, Zone, UserRole
        
        app = create_app()
        
        with app.app_context():
            try:
                # Test database connection
                db.engine.execute("SELECT 1")
                print("✅ Database connection successful!")
                
                # Check existing data
                zones = Zone.query.all()
                users = User.query.all()
                
                print(f"\n📊 Database Status:")
                print(f"Zones: {len(zones)}")
                print(f"Users: {len(users)}")
                
                if zones:
                    print(f"\n🏞️  Zones:")
                    for zone in zones:
                        print(f"  - ID: {zone.id}, Name: {zone.name}")
                
                if users:
                    print(f"\n👥 Users:")
                    for user in users:
                        print(f"  - ID: {user.id}, Name: {user.first_name} {user.last_name}, Role: {user.role.value}")
                
            except Exception as e:
                print(f"❌ Database error: {str(e)}")
                
    except ImportError as e:
        print(f"❌ Import error: {str(e)}")
        print("Make sure you're in the backend directory and dependencies are installed")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    check_database() 