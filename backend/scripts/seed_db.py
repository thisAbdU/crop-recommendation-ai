#!/usr/bin/env python3
"""
Database seeding script for the agritech backend.
Creates demo users, zones, IoT devices, and sample sensor data.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Zone, IoT, ZoneLandCondition, UserRole, IoTHealth
from app.services.prompt_service import PromptService
from datetime import datetime, timedelta
import random

def seed_database():
    """Seed the database with demo data"""
    app = create_app('development')
    
    with app.app_context():
        print("Starting database seeding...")
        
        # Clear existing data
        print("Clearing existing data...")
        ZoneLandCondition.query.delete()
        IoT.query.delete()
        Zone.query.delete()
        User.query.delete()
        
        # Create default prompt templates
        print("Creating prompt templates...")
        prompt_service = PromptService()
        prompt_service.create_default_templates()
        
        # Create users
        print("Creating users...")
        users = create_users()
        
        # Create zones
        print("Creating zones...")
        zones = create_zones(users)
        
        # Create IoT devices
        print("Creating IoT devices...")
        iots = create_iot_devices(zones, users)
        
        # Create sensor data
        print("Creating sensor data...")
        create_sensor_data(zones, iots)
        
        print("Database seeding completed successfully!")
        print("\nDemo credentials:")
        print("Central Admin: admin@example.com / password123")
        print("Zone Admin: zoneadmin@example.com / password123")
        print("Technician: tech@example.com / password123")
        print("Farmer: farmer@example.com / password123")
        print("Exporter: exporter@example.com / password123")

def create_users():
    """Create demo users"""
    users = {}
    
    # Central Admin
    central_admin = User(
        first_name="System",
        last_name="Administrator",
        email="admin@example.com",
        role=UserRole.CENTRAL_ADMIN,
        language="en"
    )
    central_admin.set_password("password123")
    db.session.add(central_admin)
    users['central_admin'] = central_admin
    
    # Zone Admin
    zone_admin = User(
        first_name="Zone",
        last_name="Manager",
        email="zoneadmin@example.com",
        role=UserRole.ZONE_ADMIN,
        language="en"
    )
    zone_admin.set_password("password123")
    db.session.add(zone_admin)
    users['zone_admin'] = zone_admin
    
    # Technician
    technician = User(
        first_name="John",
        last_name="Technician",
        email="tech@example.com",
        role=UserRole.TECHNICIAN,
        language="en"
    )
    technician.set_password("password123")
    db.session.add(technician)
    users['technician'] = technician
    
    # Farmer
    farmer = User(
        first_name="Maria",
        last_name="Farmer",
        email="farmer@example.com",
        role=UserRole.FARMER,
        language="en"
    )
    farmer.set_password("password123")
    db.session.add(farmer)
    users['farmer'] = farmer
    
    # Exporter
    exporter = User(
        first_name="Export",
        last_name="Manager",
        email="exporter@example.com",
        role=UserRole.EXPORTER,
        language="en"
    )
    exporter.set_password("password123")
    db.session.add(exporter)
    users['exporter'] = exporter
    
    db.session.commit()
    return users

def create_zones(users):
    """Create demo zones"""
    zones = []
    
    # Zone 1 - Main Farm
    zone1 = Zone(
        name="Main Farm Zone",
        latitude=40.7128,
        longitude=-74.0060,
        area_hectare=50.5,
        zone_admin_id=users['zone_admin'].id
    )
    db.session.add(zone1)
    zones.append(zone1)
    
    # Zone 2 - North Field
    zone2 = Zone(
        name="North Field",
        latitude=40.7150,
        longitude=-74.0080,
        area_hectare=25.3,
        zone_admin_id=users['zone_admin'].id
    )
    db.session.add(zone2)
    zones.append(zone2)
    
    # Zone 3 - South Field
    zone3 = Zone(
        name="South Field",
        latitude=40.7100,
        longitude=-74.0040,
        area_hectare=30.7,
        zone_admin_id=users['zone_admin'].id
    )
    db.session.add(zone3)
    zones.append(zone3)
    
    db.session.commit()
    
    # Assign users to zones
    users['zone_admin'].zone_id = zone1.id
    users['technician'].zone_id = zone1.id
    users['farmer'].zone_id = zone1.id
    db.session.commit()
    
    return zones

def create_iot_devices(zones, users):
    """Create demo IoT devices"""
    iots = []
    
    # Zone 1 devices
    for i in range(3):
        iot = IoT(
            name=f"Main Farm Sensor {i+1}",
            tag_sn=f"MAIN-{i+1:03d}",
            health=random.choice(list(IoTHealth)),
            zone_id=zones[0].id,
            assigned_to_technician_id=users['technician'].id,
            device_metadata={
                "model": "AgriSensor Pro",
                "firmware": "v2.1.0",
                "installation_date": datetime.utcnow().isoformat()
            }
        )
        db.session.add(iot)
        iots.append(iot)
    
    # Zone 2 devices
    for i in range(2):
        iot = IoT(
            name=f"North Field Sensor {i+1}",
            tag_sn=f"NORTH-{i+1:03d}",
            health=random.choice(list(IoTHealth)),
            zone_id=zones[1].id,
            assigned_to_technician_id=users['technician'].id,
            device_metadata={
                "model": "AgriSensor Pro",
                "firmware": "v2.1.0",
                "installation_date": datetime.utcnow().isoformat()
            }
        )
        db.session.add(iot)
        iots.append(iot)
    
    # Zone 3 devices
    for i in range(2):
        iot = IoT(
            name=f"South Field Sensor {i+1}",
            tag_sn=f"SOUTH-{i+1:03d}",
            health=random.choice(list(IoTHealth)),
            zone_id=zones[2].id,
            assigned_to_technician_id=users['technician'].id,
            device_metadata={
                "model": "AgriSensor Pro",
                "firmware": "v2.1.0",
                "installation_date": datetime.utcnow().isoformat()
            }
        )
        db.session.add(iot)
        iots.append(iot)
    
    db.session.commit()
    return iots

def create_sensor_data(zones, iots):
    """Create demo sensor data for the last 30 days"""
    print("Generating sensor data...")
    
    # Generate data for the last 30 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Create data points every 6 hours
    current_date = start_date
    data_count = 0
    
    while current_date <= end_date:
        for zone in zones:
            zone_iots = [iot for iot in iots if iot.zone_id == zone.id]
            
            for iot in zone_iots:
                # Generate realistic sensor readings
                reading = ZoneLandCondition(
                    zone_id=zone.id,
                    read_from_iot_at=current_date,
                    is_from_iot=True,
                    soil_moisture=random.uniform(15, 45),  # 15-45%
                    ph=random.uniform(5.5, 7.5),  # 5.5-7.5
                    temperature=random.uniform(15, 35),  # 15-35°C
                    phosphorus=random.uniform(10, 50),  # 10-50 mg/kg
                    potassium=random.uniform(100, 300),  # 100-300 mg/kg
                    humidity=random.uniform(40, 80),  # 40-80%
                    nitrogen=random.uniform(20, 60),  # 20-60 mg/kg
                    rainfall=random.uniform(0, 5),  # 0-5 mm
                    device_tag=iot.tag_sn
                )
                db.session.add(reading)
                data_count += 1
        
        current_date += timedelta(hours=6)
        
        # Commit in batches
        if data_count % 100 == 0:
            db.session.commit()
            print(f"Created {data_count} sensor readings...")
    
    db.session.commit()
    print(f"Created {data_count} total sensor readings")

if __name__ == "__main__":
    seed_database() 