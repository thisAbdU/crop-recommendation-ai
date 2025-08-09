export type Role = "investor" | "zone_admin" | "central_admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  zoneId?: string;
};

export type Zone = {
  id: string;
  name: string;
  region: string;
};

export type SensorDataPoint = {
  id: string;
  zoneId: string;
  read_from_iot_at: string; // ISO string
  soil_moisture: number; // %
  ph: number; // 0-14
  temperature: number; // °C
  phosphorus: number; // ppm
  potassium: number; // ppm
  humidity: number; // %
  nitrogen: number; // ppm
  rainfall: number; // mm
};

export type Recommendation = {
  id: string;
  zoneId: string;
  crop_name: string;
  suitability_score: number; // 0-100
  key_environmental_factors: {
    soil_type: string;
    ph: number;
    moisture_range: string;
    rainfall_forecast: string;
  };
  rationale: string;
  status: "pending" | "approved" | "declined";
  createdAt: string; // ISO
};

export type Technician = {
  id: string;
  name: string;
  assignedZoneIds: string[];
};


