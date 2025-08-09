import logging
from datetime import datetime
from app import db
from app.models import Recommendation, ZoneLandCondition, RecommendationStatus
from app.services.ai_client import AIClient
from app.services.prompt_service import PromptService
from sqlalchemy import func, and_

logger = logging.getLogger(__name__)

class RecommendationService:
    """Service for managing recommendation generation pipeline"""
    
    def __init__(self):
        self.ai_client = AIClient()
        self.prompt_service = PromptService()
    
    def generate_recommendation(self, recommendation_id):
        """Generate a recommendation for the given ID"""
        try:
            # Get recommendation record
            recommendation = Recommendation.query.get(recommendation_id)
            if not recommendation:
                raise ValueError(f"Recommendation {recommendation_id} not found")
            
            # Update status to processing
            recommendation.status = RecommendationStatus.PENDING
            db.session.commit()
            
            # Get zone data for the time range
            zone_data = self._get_zone_data(recommendation.zone_id, recommendation.start_time, recommendation.end_time)
            
            if not zone_data:
                raise ValueError("No sensor data found for the specified time range")
            
            # Aggregate features
            aggregated_features = self._aggregate_features(zone_data)
            
            # Classify soil
            soil_classification = self.ai_client.classify_soil(aggregated_features)
            
            # Search for similar examples
            similar_examples = self.ai_client.search_similar(aggregated_features, k=5)
            
            # Generate recommendation using AI
            ai_result = self.ai_client.generate_recommendation_from_aggregates(
                zone_id=recommendation.zone_id,
                start=recommendation.start_time,
                end=recommendation.end_time,
                aggregated_features=aggregated_features,
                prompt_template_id=recommendation.prompt_template_id
            )
            
            # Render response using template if available
            response_text = self._render_response(
                recommendation, 
                aggregated_features, 
                soil_classification, 
                similar_examples,
                ai_result
            )
            
            # Update recommendation with results
            recommendation.status = RecommendationStatus.GENERATED
            recommendation.response = response_text
            recommendation.crops = ai_result.get('crops', [])
            recommendation.data_used = {
                'start_time': recommendation.start_time.isoformat() if recommendation.start_time else None,
                'end_time': recommendation.end_time.isoformat() if recommendation.end_time else None,
                'data_points_count': len(zone_data),
                'aggregated_features': aggregated_features,
                'soil_classification': soil_classification,
                'similar_examples_count': len(similar_examples)
            }
            
            db.session.commit()
            
            logger.info(f"Successfully generated recommendation {recommendation_id}")
            return recommendation
            
        except Exception as e:
            logger.error(f"Error generating recommendation {recommendation_id}: {str(e)}")
            
            # Update recommendation status to failed
            if recommendation:
                recommendation.status = RecommendationStatus.FAILED
                recommendation.response = f"Generation failed: {str(e)}"
                db.session.commit()
            
            raise
    
    def _get_zone_data(self, zone_id, start_time, end_time):
        """Get sensor data for a zone within the time range"""
        query = ZoneLandCondition.query.filter_by(zone_id=zone_id).filter(
            and_(
                ZoneLandCondition.read_from_iot_at >= start_time,
                ZoneLandCondition.read_from_iot_at <= end_time
            )
        ).order_by(ZoneLandCondition.read_from_iot_at.asc())
        
        return query.all()
    
    def _aggregate_features(self, zone_data):
        """Aggregate sensor data into feature vector"""
        if not zone_data:
            return {}
        
        # Calculate basic statistics
        features = {}
        
        # Numeric fields to aggregate
        numeric_fields = [
            'soil_moisture', 'ph', 'temperature', 'phosphorus', 
            'potassium', 'humidity', 'nitrogen', 'rainfall'
        ]
        
        for field in numeric_fields:
            values = [getattr(reading, field) for reading in zone_data if getattr(reading, field) is not None]
            
            if values:
                features[f'{field}_mean'] = sum(values) / len(values)
                features[f'{field}_min'] = min(values)
                features[f'{field}_max'] = max(values)
                features[f'{field}_std'] = self._calculate_std(values)
                features[f'{field}_count'] = len(values)
            else:
                features[f'{field}_mean'] = 0
                features[f'{field}_min'] = 0
                features[f'{field}_max'] = 0
                features[f'{field}_std'] = 0
                features[f'{field}_count'] = 0
        
        # Calculate derived features
        if features.get('ph_mean', 0) > 0:
            features['ph_category'] = self._categorize_ph(features['ph_mean'])
        
        if features.get('soil_moisture_mean', 0) > 0:
            features['moisture_category'] = self._categorize_moisture(features['soil_moisture_mean'])
        
        # Calculate nutrient ratios
        if features.get('nitrogen_mean', 0) > 0 and features.get('phosphorus_mean', 0) > 0:
            features['np_ratio'] = features['nitrogen_mean'] / features['phosphorus_mean']
        
        if features.get('nitrogen_mean', 0) > 0 and features.get('potassium_mean', 0) > 0:
            features['nk_ratio'] = features['nitrogen_mean'] / features['potassium_mean']
        
        # Add time-based features
        if zone_data:
            features['data_duration_hours'] = (zone_data[-1].read_from_iot_at - zone_data[0].read_from_iot_at).total_seconds() / 3600
            features['readings_per_hour'] = len(zone_data) / max(features['data_duration_hours'], 1)
        
        return features
    
    def _calculate_std(self, values):
        """Calculate standard deviation"""
        if len(values) < 2:
            return 0
        
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
        return variance ** 0.5
    
    def _categorize_ph(self, ph_value):
        """Categorize pH value"""
        if ph_value < 5.5:
            return 'acidic'
        elif ph_value < 6.5:
            return 'slightly_acidic'
        elif ph_value < 7.5:
            return 'neutral'
        elif ph_value < 8.5:
            return 'slightly_alkaline'
        else:
            return 'alkaline'
    
    def _categorize_moisture(self, moisture_value):
        """Categorize soil moisture"""
        if moisture_value < 15:
            return 'very_dry'
        elif moisture_value < 25:
            return 'dry'
        elif moisture_value < 35:
            return 'moderate'
        elif moisture_value < 45:
            return 'moist'
        else:
            return 'very_moist'
    
    def _render_response(self, recommendation, aggregated_features, soil_classification, similar_examples, ai_result):
        """Render recommendation response using template"""
        try:
            # Prepare context for template
            context = {
                'recommendation': {
                    'id': recommendation.id,
                    'zone_id': recommendation.zone_id,
                    'start_time': recommendation.start_time,
                    'end_time': recommendation.end_time,
                    'response': ai_result.get('response', ''),
                    'crops': ai_result.get('crops', []),
                    'data_used': recommendation.data_used
                },
                'aggregated_features': aggregated_features,
                'soil_classification': soil_classification,
                'similar_examples': similar_examples,
                'crops': ai_result.get('crops', [])
            }
            
            # Use template if available
            if recommendation.prompt_template_id:
                try:
                    return self.prompt_service.render_template(recommendation.prompt_template_id, context)
                except Exception as e:
                    logger.warning(f"Failed to render template {recommendation.prompt_template_id}: {str(e)}")
                    # Fall back to AI result
                    return ai_result.get('response', 'Recommendation generated successfully.')
            else:
                # Use AI result directly
                return ai_result.get('response', 'Recommendation generated successfully.')
                
        except Exception as e:
            logger.error(f"Error rendering response: {str(e)}")
            return ai_result.get('response', 'Recommendation generated successfully.')
    
    def get_recommendation_summary(self, zone_id, days=30):
        """Get summary of recommendations for a zone"""
        from datetime import timedelta
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        recommendations = Recommendation.query.filter_by(zone_id=zone_id).filter(
            Recommendation.created_at >= start_date
        ).order_by(Recommendation.created_at.desc()).all()
        
        summary = {
            'total': len(recommendations),
            'by_status': {},
            'recent_crops': [],
            'average_suitability': 0
        }
        
        total_suitability = 0
        crop_count = 0
        
        for rec in recommendations:
            # Count by status
            status = rec.status.value
            summary['by_status'][status] = summary['by_status'].get(status, 0) + 1
            
            # Collect recent crops
            if rec.crops and rec.status == RecommendationStatus.APPROVED:
                for crop in rec.crops:
                    summary['recent_crops'].append({
                        'crop_name': crop.get('crop_name'),
                        'suitability_score': crop.get('suitability_score', 0),
                        'recommendation_date': rec.created_at.isoformat() if rec.created_at else None
                    })
                    total_suitability += crop.get('suitability_score', 0)
                    crop_count += 1
        
        if crop_count > 0:
            summary['average_suitability'] = total_suitability / crop_count
        
        return summary
    
    def validate_recommendation_request(self, zone_id, start_time, end_time):
        """Validate recommendation request parameters"""
        errors = []
        
        # Check time range
        if start_time >= end_time:
            errors.append("Start time must be before end time")
        
        if (end_time - start_time).days > 365:
            errors.append("Time range cannot exceed 1 year")
        
        # Check if zone exists
        from app.models import Zone
        zone = Zone.query.get(zone_id)
        if not zone:
            errors.append("Zone not found")
        
        # Check if there's data for the time range
        data_count = ZoneLandCondition.query.filter_by(zone_id=zone_id).filter(
            and_(
                ZoneLandCondition.read_from_iot_at >= start_time,
                ZoneLandCondition.read_from_iot_at <= end_time
            )
        ).count()
        
        if data_count == 0:
            errors.append("No sensor data found for the specified time range")
        
        return errors 