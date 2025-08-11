import os
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import current_app
import json

logger = logging.getLogger(__name__)

class InternetService:
    """Service for fetching current agricultural data from internet sources"""
    
    def __init__(self):
        self.weather_api_key = os.getenv('WEATHER_API_KEY')
        self.news_api_key = os.getenv('NEWS_API_KEY')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'CropRecommendationAI/1.0 (Agricultural AI Assistant)'
        })
    
    def get_current_weather(self, latitude: float, longitude: float) -> Dict:
        """Get current weather data for a location"""
        try:
            if not self.weather_api_key:
                logger.warning("Weather API key not configured")
                return {}
            
            url = "http://api.openweathermap.org/data/2.5/weather"
            params = {
                'lat': latitude,
                'lon': longitude,
                'appid': self.weather_api_key,
                'units': 'metric'
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return {
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'description': data['weather'][0]['description'],
                'wind_speed': data['wind']['speed'],
                'visibility': data.get('visibility', 0),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching weather data: {str(e)}")
            return {}
    
    def get_weather_forecast(self, latitude: float, longitude: float, days: int = 5) -> Dict:
        """Get weather forecast for a location"""
        try:
            if not self.weather_api_key:
                logger.warning("Weather API key not configured")
                return {}
            
            url = "http://api.openweathermap.org/data/2.5/forecast"
            params = {
                'lat': latitude,
                'lon': longitude,
                'appid': self.weather_api_key,
                'units': 'metric',
                'cnt': days * 8  # 8 forecasts per day (3-hour intervals)
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            forecasts = []
            
            for item in data['list']:
                forecast = {
                    'datetime': item['dt_txt'],
                    'temperature': item['main']['temp'],
                    'humidity': item['main']['humidity'],
                    'description': item['weather'][0]['description'],
                    'wind_speed': item['wind']['speed'],
                    'rain_probability': item.get('pop', 0)
                }
                forecasts.append(forecast)
            
            return {
                'forecasts': forecasts,
                'location': data['city']['name'],
                'country': data['city']['country']
            }
            
        except Exception as e:
            logger.error(f"Error fetching weather forecast: {str(e)}")
            return {}
    
    def get_agricultural_news(self, region: str = None, keywords: List[str] = None) -> List[Dict]:
        """Get recent agricultural news"""
        try:
            if not self.news_api_key:
                logger.warning("News API key not configured")
                return self._get_fallback_agricultural_news()
            
            # Build query for agricultural news
            query_terms = ['agriculture', 'farming', 'crops']
            if keywords:
                query_terms.extend(keywords)
            
            query = ' OR '.join(query_terms)
            if region:
                query += f' AND "{region}"'
            
            url = "https://newsapi.org/v2/everything"
            params = {
                'q': query,
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': 10,
                'apiKey': self.news_api_key,
                'from': (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            articles = []
            
            for article in data.get('articles', []):
                if article['title'] and article['description']:
                    articles.append({
                        'title': article['title'],
                        'description': article['description'],
                        'url': article['url'],
                        'published_at': article['publishedAt'],
                        'source': article['source']['name']
                    })
            
            return articles[:5]  # Return top 5 articles
            
        except Exception as e:
            logger.error(f"Error fetching agricultural news: {str(e)}")
            return self._get_fallback_agricultural_news()
    
    def get_market_trends(self, crop_names: List[str] = None) -> Dict:
        """Get agricultural market trends and prices"""
        try:
            # This would typically integrate with agricultural market APIs
            # For now, return structured mock data
            trends = {
                'timestamp': datetime.utcnow().isoformat(),
                'market_overview': 'Agricultural markets showing stable trends',
                'crop_prices': {},
                'trends': []
            }
            
            if crop_names:
                for crop in crop_names:
                    trends['crop_prices'][crop] = {
                        'current_price': 'Market price data unavailable',
                        'trend': 'stable',
                        'last_updated': datetime.utcnow().isoformat()
                    }
            
            return trends
            
        except Exception as e:
            logger.error(f"Error fetching market trends: {str(e)}")
            return {}
    
    def get_regional_agricultural_data(self, region: str) -> Dict:
        """Get region-specific agricultural data and developments"""
        try:
            # This would integrate with regional agricultural databases
            # For now, return structured mock data
            return {
                'region': region,
                'timestamp': datetime.utcnow().isoformat(),
                'agricultural_developments': [
                    'Sustainable farming practices gaining adoption',
                    'New irrigation technologies being implemented',
                    'Crop diversification initiatives in progress'
                ],
                'local_events': [
                    'Agricultural extension workshops scheduled',
                    'Soil testing campaigns ongoing',
                    'Farmer training programs available'
                ]
            }
            
        except Exception as e:
            logger.error(f"Error fetching regional agricultural data: {str(e)}")
            return {}
    
    def _get_fallback_agricultural_news(self) -> List[Dict]:
        """Fallback agricultural news when API is unavailable"""
        return [
            {
                'title': 'Sustainable Agriculture Practices on the Rise',
                'description': 'Farmers are increasingly adopting sustainable farming methods to improve soil health and crop yields.',
                'url': '#',
                'published_at': datetime.utcnow().isoformat(),
                'source': 'Agricultural Insights'
            },
            {
                'title': 'New Crop Varieties Show Promise in Drought Conditions',
                'description': 'Research institutions are developing crop varieties that perform better under water stress conditions.',
                'url': '#',
                'published_at': datetime.utcnow().isoformat(),
                'source': 'Crop Research News'
            }
        ]
    
    def get_zone_agricultural_context(self, zone_info: Dict) -> Dict:
        """Get comprehensive agricultural context for a zone"""
        try:
            context = {
                'weather': {},
                'weather_forecast': {},
                'news': [],
                'market_trends': {},
                'regional_data': {},
                'crop_specific_data': {},
                'pest_alerts': [],
                'disease_updates': [],
                'best_practices': [],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Get weather data if coordinates are available
            if zone_info.get('latitude') and zone_info.get('longitude'):
                context['weather'] = self.get_current_weather(
                    float(zone_info['latitude']), 
                    float(zone_info['longitude'])
                )
                
                context['weather_forecast'] = self.get_weather_forecast(
                    float(zone_info['latitude']), 
                    float(zone_info['longitude'])
                )
            
            # Get agricultural news
            region = zone_info.get('admin_region') or zone_info.get('name')
            context['news'] = self.get_agricultural_news(region=region)
            
            # Get market trends
            context['market_trends'] = self.get_market_trends()
            
            # Get regional data
            if region:
                context['regional_data'] = self.get_regional_agricultural_data(region)
            
            # Get crop-specific information if available
            if 'crops' in zone_info:
                context['crop_specific_data'] = self._get_crop_specific_context(zone_info['crops'])
            
            # Get pest and disease alerts for the region
            if region:
                context['pest_alerts'] = self._get_pest_alerts(region)
                context['disease_updates'] = self._get_disease_updates(region)
            
            # Get current best practices
            context['best_practices'] = self._get_current_best_practices(region)
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting zone agricultural context: {str(e)}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'error': 'Unable to fetch current agricultural context'
            }
    
    def _get_crop_specific_context(self, crops: List[str]) -> Dict:
        """Get crop-specific agricultural context"""
        try:
            crop_context = {}
            
            for crop in crops:
                if isinstance(crop, dict):
                    crop_name = crop.get('crop', crop.get('name', 'Unknown'))
                else:
                    crop_name = str(crop)
                
                # Get crop-specific news and updates
                crop_news = self.get_agricultural_news(keywords=[crop_name.lower()])
                crop_context[crop_name] = {
                    'news': crop_news[:3],  # Limit to 3 most recent
                    'market_info': self._get_crop_market_info(crop_name),
                    'weather_considerations': self._get_crop_weather_considerations(crop_name)
                }
            
            return crop_context
            
        except Exception as e:
            logger.error(f"Error getting crop-specific context: {str(e)}")
            return {}
    
    def _get_crop_market_info(self, crop_name: str) -> Dict:
        """Get market information for a specific crop"""
        try:
            # This would integrate with market APIs in a real implementation
            return {
                'current_price': 'Market data unavailable',
                'trend': 'Stable',
                'demand': 'Moderate',
                'supply': 'Adequate'
            }
        except Exception as e:
            logger.error(f"Error getting crop market info: {str(e)}")
            return {}
    
    def _get_crop_weather_considerations(self, crop_name: str) -> Dict:
        """Get weather considerations for a specific crop"""
        try:
            # This would integrate with agricultural weather APIs
            return {
                'optimal_temperature': '20-30°C',
                'water_requirements': 'Moderate',
                'frost_tolerance': 'Low',
                'drought_tolerance': 'Medium'
            }
        except Exception as e:
            logger.error(f"Error getting crop weather considerations: {str(e)}")
            return {}
    
    def _get_pest_alerts(self, region: str) -> List[Dict]:
        """Get pest alerts for a region"""
        try:
            # This would integrate with pest monitoring services
            return [
                {
                    'pest': 'Common pests in the region',
                    'severity': 'Low',
                    'recommendations': 'Monitor regularly, use IPM practices'
                }
            ]
        except Exception as e:
            logger.error(f"Error getting pest alerts: {str(e)}")
            return []
    
    def _get_disease_updates(self, region: str) -> List[Dict]:
        """Get disease updates for a region"""
        try:
            # This would integrate with disease monitoring services
            return [
                {
                    'disease': 'Common diseases in the region',
                    'risk_level': 'Low',
                    'prevention': 'Maintain good soil health, proper spacing'
                }
            ]
        except Exception as e:
            logger.error(f"Error getting disease updates: {str(e)}")
            return []
    
    def _get_current_best_practices(self, region: str = None) -> List[Dict]:
        """Get current agricultural best practices"""
        try:
            # This would integrate with agricultural extension services
            return [
                {
                    'practice': 'Sustainable soil management',
                    'description': 'Use cover crops and organic matter to improve soil health',
                    'benefits': 'Better water retention, improved nutrient availability'
                },
                {
                    'practice': 'Integrated pest management',
                    'description': 'Combine biological, cultural, and chemical control methods',
                    'benefits': 'Reduced pesticide use, better pest control'
                },
                {
                    'practice': 'Precision agriculture',
                    'description': 'Use technology to optimize inputs and improve efficiency',
                    'benefits': 'Cost savings, better resource management'
                }
            ]
        except Exception as e:
            logger.error(f"Error getting best practices: {str(e)}")
            return [] 