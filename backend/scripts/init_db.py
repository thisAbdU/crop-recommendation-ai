#!/usr/bin/env python3
"""
Script to initialize the database (create tables) if they don't exist.
This should only be run once when setting up a new environment.
"""

import sys
import os

# Fix the path resolution - go up TWO levels from scripts to reach the backend root
# Then add 'app' to reach the Flask app directory
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.dirname(script_dir)  # Go up from scripts/ to backend/
app_path = os.path.join(backend_root, 'app')  # Add 'app' to reach Flask app

sys.path.insert(0, app_path)
sys.path.insert(0, backend_root)

from app import create_app, db
from app.models import *

def init_database():
    """Initialize database tables if they don't exist"""
    app = create_app()
    
    with app.app_context():
        print("Checking database tables...")
        
        # Check if tables already exist
        try:
            # Try to query a table to see if it exists
            from app.models import User
            User.query.first()
            print("✅ Database tables already exist")
            return True
        except Exception:
            print(" Tables don't exist, creating them...")
            try:
                db.create_all()
                print("✅ All tables created successfully")
                return True
            except Exception as e:
                print(f"❌ Error creating tables: {e}")
                import traceback
                traceback.print_exc()
                return False

if __name__ == "__main__":
    success = init_database()
    if not success:
        sys.exit(1)