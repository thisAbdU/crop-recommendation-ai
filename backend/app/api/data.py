from flask import Blueprint, request, jsonify, Response, stream_template
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import ZoneLandCondition, IoT, Zone, User, UserRole
from app.schemas import SensorIngestSchema, DataQuerySchema, PaginationSchema
from app.utils import require_role, audit_log, paginate_query, require_zone_access, validate_date_range
from marshmallow import ValidationError
from datetime import datetime, timedelta
import csv
import io
from sqlalchemy import func, and_

data_bp = Blueprint('data', __name__)
sensor_ingest_schema = SensorIngestSchema()
data_query_schema = DataQuerySchema()
pagination_schema = PaginationSchema()

@data_bp.route('/ingest/sensor', methods=['POST'])
def ingest_sensor_data():
    """Public endpoint for IoT devices to post sensor readings"""
    try:
        data = sensor_ingest_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Find device by tag_sn or use zone_id
    device = IoT.query.filter_by(tag_sn=data['tag_sn']).first()
    
    if not device:
        return jsonify({'error': f'Device with tag_sn {data["tag_sn"]} not found'}), 404
    
    # Verify zone_id matches device zone
    if device.zone_id != data['zone_id']:
        return jsonify({'error': 'Zone ID does not match device zone'}), 400
    
    # Create sensor reading
    reading = ZoneLandCondition(
        zone_id=data['zone_id'],
        read_from_iot_at=data['read_from_iot_at'],
        is_from_iot=True,
        soil_moisture=data.get('soil_moisture'),
        ph=data.get('ph'),
        temperature=data.get('temperature'),
        phosphorus=data.get('phosphorus'),
        potassium=data.get('potassium'),
        humidity=data.get('humidity'),
        nitrogen=data.get('nitrogen'),
        device_tag=data['tag_sn']
    )
    
    db.session.add(reading)
    
    # Update device last_seen_at
    device.last_seen_at = datetime.utcnow()
    
    # Check for threshold alerts
    alerts = []
    if data.get('ph') and data['ph'] < 4.5:
        alerts.append('pH level is critically low')
        device.health = 'warning'
    elif data.get('ph') and data['ph'] > 8.5:
        alerts.append('pH level is critically high')
        device.health = 'warning'
    
    if data.get('soil_moisture') and data['soil_moisture'] < 10:
        alerts.append('Soil moisture is critically low')
        device.health = 'warning'
    
    db.session.commit()
    
    # Log the ingestion
    audit_log(None, 'sensor_data_ingested', 'zone_land_condition', reading.id, {
        'device_tag': data['tag_sn'],
        'zone_id': data['zone_id'],
        'alerts': alerts
    })
    
    response_data = {
        'message': 'Sensor data ingested successfully',
        'reading_id': reading.id,
        'alerts': alerts
    }
    
    return jsonify(response_data), 201

@data_bp.route('/zones/<int:zone_id>/data', methods=['GET'])
@jwt_required()
@require_zone_access('zone_id')
def get_zone_data(zone_id):
    """Get zone sensor data with filtering and aggregation"""
    # Parse query parameters
    try:
        query_data = data_query_schema.load(request.args)
    except ValidationError as err:
        return jsonify({'error': 'Invalid query parameters', 'details': err.messages}), 400
    
    # Validate date range
    try:
        validate_date_range(query_data['start'], query_data['end'])
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    # Build base query
    query = ZoneLandCondition.query.filter_by(zone_id=zone_id).filter(
        and_(
            ZoneLandCondition.read_from_iot_at >= query_data['start'],
            ZoneLandCondition.read_from_iot_at <= query_data['end']
        )
    )
    
    # Handle aggregation
    if query_data['agg'] in ['mean', 'median']:
        # For aggregation, we need to group by time intervals
        if query_data['granularity'] == 'hour':
            # Group by hour
            query = db.session.query(
                func.date_trunc('hour', ZoneLandCondition.read_from_iot_at).label('time_bucket'),
                func.avg(ZoneLandCondition.soil_moisture).label('soil_moisture'),
                func.avg(ZoneLandCondition.ph).label('ph'),
                func.avg(ZoneLandCondition.temperature).label('temperature'),
                func.avg(ZoneLandCondition.phosphorus).label('phosphorus'),
                func.avg(ZoneLandCondition.potassium).label('potassium'),
                func.avg(ZoneLandCondition.humidity).label('humidity'),
                func.avg(ZoneLandCondition.nitrogen).label('nitrogen'),
                func.avg(ZoneLandCondition.rainfall).label('rainfall')
            ).filter_by(zone_id=zone_id).filter(
                and_(
                    ZoneLandCondition.read_from_iot_at >= query_data['start'],
                    ZoneLandCondition.read_from_iot_at <= query_data['end']
                )
            ).group_by(func.date_trunc('hour', ZoneLandCondition.read_from_iot_at))
        else:
            # Group by day
            query = db.session.query(
                func.date_trunc('day', ZoneLandCondition.read_from_iot_at).label('time_bucket'),
                func.avg(ZoneLandCondition.soil_moisture).label('soil_moisture'),
                func.avg(ZoneLandCondition.ph).label('ph'),
                func.avg(ZoneLandCondition.temperature).label('temperature'),
                func.avg(ZoneLandCondition.phosphorus).label('phosphorus'),
                func.avg(ZoneLandCondition.potassium).label('potassium'),
                func.avg(ZoneLandCondition.humidity).label('humidity'),
                func.avg(ZoneLandCondition.nitrogen).label('nitrogen'),
                func.avg(ZoneLandCondition.rainfall).label('rainfall')
            ).filter_by(zone_id=zone_id).filter(
                and_(
                    ZoneLandCondition.read_from_iot_at >= query_data['start'],
                    ZoneLandCondition.read_from_iot_at <= query_data['end']
                )
            ).group_by(func.date_trunc('day', ZoneLandCondition.read_from_iot_at))
        
        # Execute aggregation query
        results = query.all()
        
        # Format results
        items = []
        for row in results:
            item = {
                'time_bucket': row.time_bucket.isoformat() if row.time_bucket else None,
                'soil_moisture': float(row.soil_moisture) if row.soil_moisture else None,
                'ph': float(row.ph) if row.ph else None,
                'temperature': float(row.temperature) if row.temperature else None,
                'phosphorus': float(row.phosphorus) if row.phosphorus else None,
                'potassium': float(row.potassium) if row.potassium else None,
                'humidity': float(row.humidity) if row.humidity else None,
                'nitrogen': float(row.nitrogen) if row.nitrogen else None,
                'rainfall': float(row.rainfall) if row.rainfall else None
            }
            items.append(item)
        
        result = {
            'items': items,
            'meta': {
                'zone_id': zone_id,
                'aggregation': query_data['agg'],
                'granularity': query_data['granularity'],
                'start': query_data['start'].isoformat(),
                'end': query_data['end'].isoformat(),
                'total': len(items)
            }
        }
    else:
        # Raw data - use pagination
        result = paginate_query(
            query.order_by(ZoneLandCondition.read_from_iot_at.desc()),
            page=query_data['page'],
            per_page=query_data['per_page']
        )
        
        # Add metadata
        result['meta'].update({
            'zone_id': zone_id,
            'aggregation': query_data['agg'],
            'granularity': query_data['granularity'],
            'start': query_data['start'].isoformat(),
            'end': query_data['end'].isoformat()
        })
    
    return jsonify(result), 200

@data_bp.route('/zones/<int:zone_id>/data/export', methods=['GET'])
@jwt_required()
@require_zone_access('zone_id')
def export_zone_data(zone_id):
    """Export zone data as CSV"""
    # Parse query parameters
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    
    if not start_str or not end_str:
        return jsonify({'error': 'Start and end dates are required'}), 400
    
    try:
        start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
        validate_date_range(start, end)
    except (ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    
    # Get data
    readings = ZoneLandCondition.query.filter_by(zone_id=zone_id).filter(
        and_(
            ZoneLandCondition.read_from_iot_at >= start,
            ZoneLandCondition.read_from_iot_at <= end
        )
    ).order_by(ZoneLandCondition.read_from_iot_at.desc()).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'ID', 'Zone ID', 'Read From IoT At', 'Is From IoT', 'Soil Moisture', 'pH',
        'Temperature', 'Phosphorus', 'Potassium', 'Humidity', 'Nitrogen', 'Rainfall',
        'Soil Type', 'Device Tag', 'Created At'
    ])
    
    # Write data
    for reading in readings:
        writer.writerow([
            reading.id,
            reading.zone_id,
            reading.read_from_iot_at.isoformat() if reading.read_from_iot_at else '',
            reading.is_from_iot,
            reading.soil_moisture,
            reading.ph,
            reading.temperature,
            reading.phosphorus,
            reading.potassium,
            reading.humidity,
            reading.nitrogen,
            reading.rainfall,
            reading.soil_type,
            reading.device_tag,
            reading.created_at.isoformat() if reading.created_at else ''
        ])
    
    # Create response
    output.seek(0)
    
    # Log the export
    current_user_id = get_jwt_identity()
    audit_log(current_user_id, 'data_exported', 'zone', zone_id, {
        'start': start.isoformat(),
        'end': end.isoformat(),
        'record_count': len(readings)
    })
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename="zone_{zone_id}_data_{start.date()}_to_{end.date()}.csv"'
        }
    )

@data_bp.route('/zones/<int:zone_id>/data/summary', methods=['GET'])
@jwt_required()
@require_zone_access('zone_id')
def get_zone_data_summary(zone_id):
    """Get summary statistics for zone data"""
    # Get date range from query params or default to last 30 days
    days = int(request.args.get('days', 30))
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get summary statistics
    summary = db.session.query(
        func.count(ZoneLandCondition.id).label('total_readings'),
        func.avg(ZoneLandCondition.soil_moisture).label('avg_soil_moisture'),
        func.avg(ZoneLandCondition.ph).label('avg_ph'),
        func.avg(ZoneLandCondition.temperature).label('avg_temperature'),
        func.avg(ZoneLandCondition.phosphorus).label('avg_phosphorus'),
        func.avg(ZoneLandCondition.potassium).label('avg_potassium'),
        func.avg(ZoneLandCondition.humidity).label('avg_humidity'),
        func.avg(ZoneLandCondition.nitrogen).label('avg_nitrogen'),
        func.avg(ZoneLandCondition.rainfall).label('avg_rainfall'),
        func.min(ZoneLandCondition.read_from_iot_at).label('first_reading'),
        func.max(ZoneLandCondition.read_from_iot_at).label('last_reading')
    ).filter_by(zone_id=zone_id).filter(
        ZoneLandCondition.read_from_iot_at >= start_date
    ).first()
    
    # Get device count
    device_count = IoT.query.filter_by(zone_id=zone_id).count()
    
    # Get recent activity (last 24 hours)
    recent_24h = ZoneLandCondition.query.filter_by(zone_id=zone_id).filter(
        ZoneLandCondition.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    return jsonify({
        'zone_id': zone_id,
        'period_days': days,
        'total_readings': summary.total_readings or 0,
        'device_count': device_count,
        'recent_24h_readings': recent_24h,
        'averages': {
            'soil_moisture': float(summary.avg_soil_moisture) if summary.avg_soil_moisture else None,
            'ph': float(summary.avg_ph) if summary.avg_ph else None,
            'temperature': float(summary.avg_temperature) if summary.avg_temperature else None,
            'phosphorus': float(summary.avg_phosphorus) if summary.avg_phosphorus else None,
            'potassium': float(summary.avg_potassium) if summary.avg_potassium else None,
            'humidity': float(summary.avg_humidity) if summary.avg_humidity else None,
            'nitrogen': float(summary.avg_nitrogen) if summary.avg_nitrogen else None,
            'rainfall': float(summary.avg_rainfall) if summary.avg_rainfall else None
        },
        'time_range': {
            'first_reading': summary.first_reading.isoformat() if summary.first_reading else None,
            'last_reading': summary.last_reading.isoformat() if summary.last_reading else None
        }
    }), 200 