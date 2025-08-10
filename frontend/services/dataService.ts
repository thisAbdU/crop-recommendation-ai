import { apiClient } from './api';

export interface Zone {
  id: string;
  name: string;
  location: string;
  size: number;
  crop_type: string;
  status: string;
}

export interface Recommendation {
  id: string;
  zone_id: string;
  crop_type: string;
  planting_date: string;
  expected_yield: number;
  status: string;
  created_at: string;
}

export interface SensorData {
  id: string;
  zone_id: string;
  temperature: number;
  humidity: number;
  soil_moisture: number;
  timestamp: string;
}

export interface Farmer {
  id: string;
  name: string;
  zone_id: string;
  contact: string;
  status: string;
}

export interface Device {
  id: string;
  zone_id: string;
  type: string;
  status: string;
  last_maintenance: string;
}

export class DataService {
  // Zone operations
  static async getZones(): Promise<Zone[]> {
    const response = await apiClient.get<Zone[]>('/api/zones/');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  static async getZoneById(id: string): Promise<Zone | null> {
    const response = await apiClient.get<Zone>(`/api/zones/${id}/`);
    if (response.error) throw new Error(response.error);
    return response.data || null;
  }

  static async createZone(zone: Omit<Zone, 'id'>): Promise<Zone> {
    const response = await apiClient.post<Zone>('/api/zones/', zone);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  static async updateZone(id: string, updates: Partial<Zone>): Promise<Zone> {
    const response = await apiClient.put<Zone>(`/api/zones/${id}/`, updates);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  static async deleteZone(id: string): Promise<boolean> {
    const response = await apiClient.delete<boolean>(`/api/zones/${id}/`);
    if (response.error) throw new Error(response.error);
    return true;
  }

  // Recommendation operations
  static async getRecommendations(): Promise<Recommendation[]> {
    const response = await apiClient.get<Recommendation[]>('/api/recommendations/');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  static async getRecommendationsByZone(zoneId: string): Promise<Recommendation[]> {
    const response = await apiClient.get<Recommendation[]>(`/api/zones/${zoneId}/recommendations/`);
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  static async createRecommendation(recommendation: Omit<Recommendation, 'id' | 'created_at'>): Promise<Recommendation> {
    const response = await apiClient.post<Recommendation>('/api/recommendations/', recommendation);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  // Sensor data operations
  static async getSensorData(zoneId?: string): Promise<SensorData[]> {
    const endpoint = zoneId ? `/api/zones/${zoneId}/sensor-data/` : '/api/sensor-data/';
    const response = await apiClient.get<SensorData[]>(endpoint);
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Farmer operations
  static async getFarmers(zoneId?: string): Promise<Farmer[]> {
    const endpoint = zoneId ? `/api/zones/${zoneId}/farmers/` : '/api/farmers/';
    const response = await apiClient.get<Farmer[]>(endpoint);
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  static async createFarmer(farmer: Omit<Farmer, 'id'>): Promise<Farmer> {
    const response = await apiClient.post<Farmer>('/api/farmers/', farmer);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  // Device operations
  static async getDevices(zoneId?: string): Promise<Device[]> {
    const endpoint = zoneId ? `/api/zones/${zoneId}/devices/` : '/api/devices/';
    const response = await apiClient.get<Device[]>(endpoint);
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Dashboard data
  static async getDashboardStats(role: string, zoneId?: string): Promise<any> {
    const endpoint = zoneId ? `/api/dashboard/${role}/${zoneId}/` : `/api/dashboard/${role}/`;
    const response = await apiClient.get<any>(endpoint);
    if (response.error) throw new Error(response.error);
    return response.data || {};
  }
}
