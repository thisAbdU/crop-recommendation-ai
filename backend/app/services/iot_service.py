import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
import json

from ..models import db, IoT, SensorData, Zone, User

logger = logging.getLogger(__name__)

class IoTService:
    """Service for managing IoT devices and sensor data"""
    
    def __init__(self):
        pass
    
    def get_zone_iot_devices(self, zone_id: int) -> List[Dict[str, Any]]:
        """Get all IoT devices for a specific zone"""
        try:
            devices = IoT.query.filter_by(zone_id=zone_id).all()
            
            return [{
                'id': device.id,
                'device_id': device.device_id,
                'device_type': device.device_type,
                'status': device.status,
                'last_seen': device.last_seen.isoformat() if device.last_seen else None,
                'location': device.location,
                'zone_id': device.zone_id
            } for device in devices]
            
        except Exception as e:
            logger.error(f"Error getting IoT devices for zone {zone_id}: {str(e)}")
            return []
    
    def get_device_sensor_data(self, device_id: str, 
                              start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None,
                              limit: int = 100) -> List[Dict[str, Any]]:
        """Get sensor data from a specific IoT device"""
        try:
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=7)
            
            sensor_data = SensorData.query.filter(
                and_(
                    SensorData.device_id == device_id,
                    SensorData.timestamp >= start_date,
                    SensorData.timestamp <= end_date
                )
            ).order_by(desc(SensorData.timestamp)).limit(limit).all()
            
            return [{
                'id': data.id,
                'timestamp': data.timestamp.isoformat(),
                'nitrogen': data.nitrogen,
                'phosphorus': data.phosphorus,
                'potassium': data.potassium,
                'ph': data.ph,
                'soil_moisture': data.soil_moisture,
                'temperature': data.temperature,
                'humidity': data.humidity,
                'rainfall': data.rainfall,
                'zone_id': data.zone_id,
                'device_id': data.device_id
            } for data in sensor_data]
            
        except Exception as e:
            logger.error(f"Error getting sensor data for device {device_id}: {str(e)}")
            return []
    
    def get_latest_sensor_readings(self, zone_id: int) -> Dict[str, Any]:
        """Get the latest sensor readings from all devices in a zone"""
        try:
            # Get the most recent sensor data for each device in the zone
            latest_readings = db.session.query(
                SensorData.device_id,
                func.max(SensorData.timestamp).label('latest_timestamp')
            ).filter(SensorData.zone_id == zone_id).group_by(SensorData.device_id).all()
            
            if not latest_readings:
                return {}
            
            # Get the actual sensor data for these latest timestamps
            sensor_data = []
            for device_id, latest_timestamp in latest_readings:
                data = SensorData.query.filter(
                    and_(
                        SensorData.device_id == device_id,
                        SensorData.timestamp == latest_timestamp
                    )
                ).first()
                
                if data:
                    sensor_data.append({
                        'device_id': data.device_id,
                        'timestamp': data.timestamp.isoformat(),
                        'nitrogen': data.nitrogen,
                        'phosphorus': data.phosphorus,
                        'potassium': data.potassium,
                        'ph': data.ph,
                        'soil_moisture': data.soil_moisture,
                        'temperature': data.temperature,
                        'humidity': data.humidity,
                        'rainfall': data.rainfall
                    })
            
            return {
                'zone_id': zone_id,
                'latest_readings': sensor_data,
                'total_devices': len(sensor_data),
                'last_updated': max([data['timestamp'] for data in sensor_data]) if sensor_data else None
            }
            
        except Exception as e:
            logger.error(f"Error getting latest sensor readings for zone {zone_id}: {str(e)}")
            return {}
    
    def mock_iot_data_ingestion(self, zone_id: int, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock IoT data ingestion - simulates receiving data from IoT servers"""
        try:
            # Validate zone exists
            zone = Zone.query.get(zone_id)
            if not zone:
                raise ValueError(f"Zone {zone_id} not found")
            
            # Create mock device ID if not provided
            device_id = sensor_data.get('device_id', f"mock_device_{zone_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
            
            # Create sensor data record
            sensor_record = SensorData(
                zone_id=zone_id,
                device_id=device_id,
                timestamp=datetime.utcnow(),
                nitrogen=sensor_data.get('nitrogen', 50.0),
                phosphorus=sensor_data.get('phosphorus', 50.0),
                potassium=sensor_data.get('potassium', 50.0),
                ph=sensor_data.get('ph', 6.5),
                soil_moisture=sensor_data.get('soil_moisture', 30.0),
                temperature=sensor_data.get('temperature', 25.0),
                humidity=sensor_data.get('humidity', 70.0),
                rainfall=sensor_data.get('rainfall', 100.0)
            )
            
            db.session.add(sensor_record)
            db.session.commit()
            
            logger.info(f"Mock IoT data ingested for zone {zone_id}, device {device_id}")
            
            return {
                'success': True,
                'message': 'IoT data ingested successfully',
                'sensor_data_id': sensor_record.id,
                'device_id': device_id,
                'zone_id': zone_id,
                'timestamp': sensor_record.timestamp.isoformat(),
                'data_quality': self._assess_data_quality(sensor_data)
            }
            
        except Exception as e:
            logger.error(f"Error in mock IoT data ingestion: {str(e)}")
            db.session.rollback()
            raise
    
    def get_zone_sensor_summary(self, zone_id: int, days: int = 7) -> Dict[str, Any]:
        """Get a summary of sensor data for a zone over a specified period"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get all sensor data for the period
            sensor_data = SensorData.query.filter(
                and_(
                    SensorData.zone_id == zone_id,
                    SensorData.timestamp >= start_date,
                    SensorData.timestamp <= end_date
                )
            ).all()
            
            if not sensor_data:
                return {
                    'zone_id': zone_id,
                    'period_days': days,
                    'total_readings': 0,
                    'devices_count': 0,
                    'data_quality': 'No data available'
                }
            
            # Calculate statistics
            total_readings = len(sensor_data)
            devices = set(data.device_id for data in sensor_data)
            devices_count = len(devices)
            
            # Calculate averages for key metrics
            metrics = ['nitrogen', 'phosphorus', 'potassium', 'ph', 'soil_moisture', 'temperature', 'humidity', 'rainfall']
            averages = {}
            
            for metric in metrics:
                values = [getattr(data, metric) for data in sensor_data if getattr(data, metric) is not None]
                if values:
                    averages[metric] = round(sum(values) / len(values), 2)
                else:
                    averages[metric] = None
            
            # Assess data quality
            data_quality = self._assess_data_quality_summary(sensor_data)
            
            return {
                'zone_id': zone_id,
                'period_days': days,
                'total_readings': total_readings,
                'devices_count': devices_count,
                'devices': list(devices),
                'averages': averages,
                'data_quality': data_quality,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting zone sensor summary for zone {zone_id}: {str(e)}")
            return {}
    
    def _assess_data_quality(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess the quality of individual sensor data"""
        quality_score = 100
        issues = []
        
        # Check for missing critical values
        critical_fields = ['nitrogen', 'phosphorus', 'potassium', 'ph', 'soil_moisture']
        for field in critical_fields:
            if field not in sensor_data or sensor_data[field] is None:
                quality_score -= 20
                issues.append(f"Missing {field}")
        
        # Check for reasonable value ranges
        if 'ph' in sensor_data and sensor_data['ph']:
            if not (3.0 <= sensor_data['ph'] <= 11.0):
                quality_score -= 15
                issues.append("pH out of reasonable range")
        
        if 'soil_moisture' in sensor_data and sensor_data['soil_moisture']:
            if not (0 <= sensor_data['soil_moisture'] <= 100):
                quality_score -= 15
                issues.append("Soil moisture out of reasonable range")
        
        quality_score = max(0, quality_score)
        
        return {
            'score': quality_score,
            'grade': 'A' if quality_score >= 90 else 'B' if quality_score >= 70 else 'C' if quality_score >= 50 else 'D',
            'issues': issues,
            'recommendation': 'High quality data' if quality_score >= 90 else 'Good quality data' if quality_score >= 70 else 'Moderate quality data' if quality_score >= 50 else 'Poor quality data - verification recommended'
        }
    
    def _assess_data_quality_summary(self, sensor_data_list: List[SensorData]) -> Dict[str, Any]:
        """Assess the overall quality of sensor data for a zone"""
        if not sensor_data_list:
            return {'overall_quality': 'No data', 'completeness': 0, 'issues': ['No sensor data available']}
        
        total_fields = 0
        missing_fields = 0
        out_of_range_fields = 0
        issues = []
        
        for data in sensor_data_list:
            # Check each field
            fields = ['nitrogen', 'phosphorus', 'potassium', 'ph', 'soil_moisture', 'temperature', 'humidity', 'rainfall']
            for field in fields:
                total_fields += 1
                value = getattr(data, field)
                
                if value is None:
                    missing_fields += 1
                else:
                    # Check for out-of-range values
                    if field == 'ph' and not (3.0 <= value <= 11.0):
                        out_of_range_fields += 1
                    elif field == 'soil_moisture' and not (0 <= value <= 100):
                        out_of_range_fields += 1
                    elif field in ['temperature'] and not (-50 <= value <= 60):
                        out_of_range_fields += 1
                    elif field in ['humidity'] and not (0 <= value <= 100):
                        out_of_range_fields += 1
        
        completeness = ((total_fields - missing_fields) / total_fields * 100) if total_fields > 0 else 0
        data_quality_score = max(0, 100 - (missing_fields / total_fields * 50) - (out_of_range_fields / total_fields * 30)) if total_fields > 0 else 0
        
        if missing_fields > 0:
            issues.append(f"{missing_fields} missing data points")
        if out_of_range_fields > 0:
            issues.append(f"{out_of_range_fields} out-of-range values")
        
        if not issues:
            issues.append("All data appears valid")
        
        return {
            'overall_quality': 'Excellent' if data_quality_score >= 90 else 'Good' if data_quality_score >= 70 else 'Moderate' if data_quality_score >= 50 else 'Poor',
            'completeness': round(completeness, 1),
            'data_quality_score': round(data_quality_score, 1),
            'total_data_points': total_fields,
            'missing_data': missing_fields,
            'out_of_range': out_of_range_fields,
            'issues': issues
        } 