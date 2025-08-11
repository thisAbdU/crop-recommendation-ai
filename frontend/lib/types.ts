// User role types
export type Role = "central_admin" | "zone_admin" | "investor";

// Sensor data point interface
export interface SensorDataPoint {
  id: string | number;
  read_from_iot_at: string;
  soil_moisture: number;
  ph: number;
  temperature: number;
  phosphorus: number;
  potassium: number;
  humidity: number;
  nitrogen: number;
  rainfall: number;
  zone_id?: string;
}

// User interface
export interface User {
  id: number;
  name: string;
  email: string;
  zone_id?: string;
  role: Role;
}

// Auth state interface
export interface AuthState {
  user: User;
  token: string;
}

// API response interfaces
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Signup credentials
export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  role: Role;
  zone_id?: string;
}

// Zone interface
export interface Zone {
  id: number;
  name: string;
  region: string;
  description: string;
  technician: string;
  iotHealth: string;
  crops: string[];
  suitability: number;
  area: number;
  soilType: string;
  climate: string;
  lastUpdate: string;
}

// Farmer interface
export interface Farmer {
  id: number;
  name: string;
  email: string;
  phone: string;
  zone_id: string;
  status: string;
  crops: string[];
  area: number;
  lastVisit: string;
}

// IoT Device interface
export interface IoTDevice {
  id: number;
  name: string;
  zone_id: string;
  type: string;
  status: string;
  lastReading: string;
  battery: number;
  location: string;
}

// Technician interface
export interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  assignedZoneIds?: string[];
}

// Recommendation interface
export interface Recommendation {
  id: string;
  zoneId: string;
  crop: string;
  variety: string;
  plantingDate: string;
  harvestDate: string;
  status: string;
  suitability_score: number;
  key_environmental_factors: {
    ph: number;
    soil_type: string;
    climate: string;
  };
  rationale: string;
  createdAt: string;
  updatedAt: string;
}

// AI Recommendation API Response interfaces
export interface AIRecommendationCrop {
  crop_name: string;
  key_environmental_factors: {
    moisture_optimal: string;
    ph_optimal: string;
    temperature_optimal: string;
  };
  probability: number;
  rank: number;
  rationale_text: string;
  soil_type: string;
  suitability_score: number;
}

export interface AIRecommendationDataQuality {
  grade: string;
  issues: string[];
  recommendation: string;
  score: number;
}

export interface AIRecommendationResult {
  confidence: number;
  crops: AIRecommendationCrop[];
  data_quality: AIRecommendationDataQuality;
  generated_at: string;
  response: string;
  soil_type: string;
}

export interface AIRecommendationResponse {
  success: boolean;
  message: string;
  data: {
    ai_result: AIRecommendationResult;
    confidence: number;
    data_quality: AIRecommendationDataQuality;
    generated_at: string;
    recommendation_id: number;
    zone_id: number;
    zone_name: string;
  };
}

// Chat message interface for AI chatbot
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    crop_recommendation?: AIRecommendationCrop;
    sensor_data?: Partial<SensorDataPoint>;
  };
} 