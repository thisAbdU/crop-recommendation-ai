import requests
import logging
from flask import current_app
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class WeatherService:
    """Service for fetching weather data from OpenWeather API"""
    
    def __init__(self):
        self.api_key = current_app.config.get('OPENWEATHER_API_KEY')
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        
        if not self.api_key:
            logger.warning("OpenWeather API key not configured")
    
    def get_current_weather(self, lat, lon):
        """Get current weather for coordinates"""
        if not self.api_key:
            return None
        
        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'description': data['weather'][0]['description'],
                'wind_speed': data['wind']['speed'],
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching current weather: {str(e)}")
            return None
    
    def get_forecast(self, lat, lon, days=5):
        """Get weather forecast for coordinates"""
        if not self.api_key:
            return None
        
        try:
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': days * 8  # 8 readings per day (3-hour intervals)
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            forecast = []
            for item in data['list']:
                # Calculate rainfall (sum of rain in 3h period)
                rainfall = 0
                if 'rain' in item and '3h' in item['rain']:
                    rainfall = item['rain']['3h']
                
                forecast.append({
                    'timestamp': datetime.fromtimestamp(item['dt']).isoformat(),
                    'temperature': item['main']['temp'],
                    'humidity': item['main']['humidity'],
                    'pressure': item['main']['pressure'],
                    'rainfall': rainfall,
                    'description': item['weather'][0]['description'],
                    'wind_speed': item['wind']['speed']
                })
            
            return {
                'location': {
                    'lat': lat,
                    'lon': lon,
                    'name': data['city']['name']
                },
                'forecast': forecast
            }
            
        except Exception as e:
            logger.error(f"Error fetching weather forecast: {str(e)}")
            return None
    
    def get_historical_weather(self, lat, lon, date):
        """Get historical weather data (requires paid API)"""
        if not self.api_key:
            return None
        
        try:
            # Convert date to timestamp
            timestamp = int(date.timestamp())
            
            url = f"{self.base_url}/onecall/timemachine"
            params = {
                'lat': lat,
                'lon': lon,
                'dt': timestamp,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if 'data' in data and len(data['data']) > 0:
                item = data['data'][0]
                
                return {
                    'timestamp': datetime.fromtimestamp(item['dt']).isoformat(),
                    'temperature': item['temp'],
                    'humidity': item['humidity'],
                    'pressure': item['pressure'],
                    'rainfall': item.get('rain', 0),
                    'description': item['weather'][0]['description'],
                    'wind_speed': item['wind_speed']
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching historical weather: {str(e)}")
            return None
    
    def get_weather_alerts(self, lat, lon):
        """Get weather alerts for coordinates"""
        if not self.api_key:
            return None
        
        try:
            url = f"{self.base_url}/onecall"
            params = {
                'lat': lat,
                'lon': lon,
                'exclude': 'current,minutely,hourly,daily',
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            alerts = []
            if 'alerts' in data:
                for alert in data['alerts']:
                    alerts.append({
                        'event': alert['event'],
                        'description': alert['description'],
                        'start': datetime.fromtimestamp(alert['start']).isoformat(),
                        'end': datetime.fromtimestamp(alert['end']).isoformat(),
                        'severity': alert.get('severity', 'unknown')
                    })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error fetching weather alerts: {str(e)}")
            return None
    
    def get_weather_summary(self, lat, lon):
        """Get a summary of current weather conditions"""
        current = self.get_current_weather(lat, lon)
        forecast = self.get_forecast(lat, lon, days=3)
        alerts = self.get_weather_alerts(lat, lon)
        
        summary = {
            'current': current,
            'forecast_summary': None,
            'alerts': alerts or []
        }
        
        if forecast and forecast['forecast']:
            # Calculate forecast summary
            temps = [f['temperature'] for f in forecast['forecast']]
            rainfall = [f['rainfall'] for f in forecast['forecast']]
            
            summary['forecast_summary'] = {
                'avg_temperature': sum(temps) / len(temps),
                'min_temperature': min(temps),
                'max_temperature': max(temps),
                'total_rainfall': sum(rainfall),
                'days_with_rain': len([r for r in rainfall if r > 0])
            }
        
        return summary 