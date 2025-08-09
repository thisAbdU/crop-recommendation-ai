#!/usr/bin/env python3
"""
Script to reset the database by dropping all tables and recreating them.
This is useful when making schema changes that require a fresh database.
"""

import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db
from app.models import *

def reset_database():
    """Drop all tables and recreate them"""
    app = create_app()
    
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        
        print("Creating all tables...")
        db.create_all()
        
        print("Database reset completed successfully!")
        print("You can now run the seed script to populate the database with sample data.")

if __name__ == "__main__":
    reset_database() 