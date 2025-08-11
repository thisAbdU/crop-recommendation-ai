import { Recommendation, Role, SensorDataPoint, Technician, User, Zone, Farmer, IoTDevice } from "./types";

// Mock data for testing
const mockSensorData: SensorDataPoint[] = [
  {
    id: 1,
    read_from_iot_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    soil_moisture: 65,
    ph: 6.8,
    temperature: 24,
    phosphorus: 45,
    potassium: 180,
    humidity: 72,
    nitrogen: 35,
    rainfall: 0,
    zone_id: "zone_001"
  },
  {
    id: 2,
    read_from_iot_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    soil_moisture: 58,
    ph: 6.5,
    temperature: 26,
    phosphorus: 42,
    potassium: 175,
    humidity: 68,
    nitrogen: 32,
    rainfall: 5,
    zone_id: "zone_001"
  },
  {
    id: 3,
    read_from_iot_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    soil_moisture: 62,
    ph: 6.9,
    temperature: 23,
    phosphorus: 48,
    potassium: 185,
    humidity: 75,
    nitrogen: 38,
    rainfall: 0,
    zone_id: "zone_001"
  },
  {
    id: 4,
    read_from_iot_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    soil_moisture: 55,
    ph: 6.3,
    temperature: 27,
    phosphorus: 40,
    potassium: 170,
    humidity: 65,
    nitrogen: 30,
    rainfall: 8,
    zone_id: "zone_001"
  },
  {
    id: 5,
    read_from_iot_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    soil_moisture: 70,
    ph: 7.1,
    temperature: 22,
    phosphorus: 50,
    potassium: 190,
    humidity: 78,
    nitrogen: 40,
    rainfall: 0,
    zone_id: "zone_001"
  }
];

// Mock other data
const mockRecommendations: Recommendation[] = [
  {
    id: "1",
    zoneId: "zone_001",
    crop: "Corn",
    variety: "Sweet Corn",
    plantingDate: new Date().toISOString(),
    harvestDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: "approved",
    suitability_score: 85,
    key_environmental_factors: {
      ph: 6.8,
      soil_type: "Loamy",
      climate: "Temperate"
    },
    rationale: "Optimal conditions for corn growth",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockTechnicians: Technician[] = [];
const mockUsers: User[] = [];
const mockZones: Zone[] = [];
const mockFarmers: Farmer[] = [
  {
    id: 1,
    name: "John Farmer",
    email: "john@farm.com",
    phone: "+1234567890",
    zone_id: "zone_001",
    status: "active",
    crops: ["Corn", "Soybeans"],
    area: 150,
    lastVisit: new Date().toISOString()
  }
];
const mockDevices: IoTDevice[] = [
  {
    id: 1,
    name: "Soil Sensor 001",
    zone_id: "zone_001",
    type: "soil_sensor",
    status: "online",
    lastReading: new Date().toISOString(),
    battery: 85,
    location: "Field A"
  }
];

// Backend API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// New API functions for real backend integration
export async function fetchUserRecommendations(): Promise<Recommendation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/user`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Error fetching user recommendations:', error);
    // Fallback to mock data if API fails
    return mockRecommendations;
  }
}

export async function fetchZoneRecommendations(zoneId: string): Promise<Recommendation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/history/${zoneId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Error fetching zone recommendations:', error);
    // Fallback to mock data if API fails
    return mockRecommendations.filter(r => r.zoneId === zoneId);
  }
}

export async function fetchZones(): Promise<Zone[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/zones`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.zones || [];
  } catch (error) {
    console.error('Error fetching zones:', error);
    // Fallback to mock data if API fails
    return mockZones;
  }
}

export async function generateRecommendationForZone(zoneId: string): Promise<Recommendation | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/generate`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone_id: parseInt(zoneId),
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        end_date: new Date().toISOString()
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.recommendation || null;
  } catch (error) {
    console.error('Error generating recommendation:', error);
    return null;
  }
}

export async function mockIoTDataIngestion(zoneId: string, sensorData: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/mock/iot-data`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone_id: parseInt(zoneId),
        sensor_data: sensorData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error mocking IoT data ingestion:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function loginWithJwtMock(email: string, _password: string): Promise<{ token: string; user: User } | null> {
  const user = mockUsers.find((u) => u.email === email);
  if (!user) return null;
  return { token: `mock-token-${user.id}`, user };
}

export async function getZones(): Promise<Zone[]> {
  return mockZones;
}

export async function getZoneById(id: string): Promise<Zone | undefined> {
  return mockZones.find((z) => z.id === parseInt(id));
}

export async function getRecommendationsByZone(zoneId: string): Promise<Recommendation[]> {
  return mockRecommendations
    .filter((r) => r.zoneId === zoneId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getApprovedRecommendationsByZone(zoneId: string): Promise<Recommendation[]> {
  return mockRecommendations.filter((r) => r.zoneId === zoneId && r.status === "approved");
}

export async function getRecommendationById(id: string): Promise<Recommendation | undefined> {
  return mockRecommendations.find((r) => r.id === id);
}

export async function getSensorDataByZone(zoneId: string, from?: string, to?: string): Promise<SensorDataPoint[]> {
  let data = mockSensorData.filter((d) => d.zone_id === zoneId);
  if (from) {
    const fromTime = new Date(from).getTime();
    data = data.filter((d) => new Date(d.read_from_iot_at).getTime() >= fromTime);
  }
  if (to) {
    const toTime = new Date(to).getTime();
    data = data.filter((d) => new Date(d.read_from_iot_at).getTime() <= toTime);
  }
  return data;
}

export async function updateRecommendationStatus(id: string, status: "approved" | "declined"): Promise<Recommendation | null> {
  const idx = mockRecommendations.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  mockRecommendations[idx] = { ...mockRecommendations[idx], status };
  return mockRecommendations[idx];
}

export async function regenerateRecommendation(id: string): Promise<Recommendation | null> {
  const rec = mockRecommendations.find((r) => r.id === id);
  if (!rec) return null;
  rec.suitability_score = Math.min(100, Math.max(50, Math.round(rec.suitability_score + (Math.random() * 10 - 5))));
  rec.rationale = `Regenerated rationale at ${new Date().toISOString()}.`;
  rec.status = "pending";
  return rec;
}

export async function getTechnicians(): Promise<Technician[]> {
  return mockTechnicians;
}

export async function assignTechnicianToZone(technicianId: string, zoneId: string): Promise<Technician | null> {
  const tech = mockTechnicians.find((t) => t.id === parseInt(technicianId));
  if (!tech) return null;
  if (!tech.assignedZoneIds) tech.assignedZoneIds = [];
  if (!tech.assignedZoneIds.includes(zoneId)) tech.assignedZoneIds.push(zoneId);
  return tech;
}

export async function getDashboardDataForRole(role: Role, user?: User) {
  if (role === "investor") {
    try {
      // Fetch real data from backend
      const zones = await fetchZones();
      const userRecommendations = await fetchUserRecommendations();
      
      return Promise.all(
        zones.map(async (zone) => {
          // Get recommendations for this zone
          const zoneRecs = userRecommendations
            .filter((r) => r.zoneId === zone.id.toString())
            .sort((a, b) => b.suitability_score - a.suitability_score);

          // Get the best recommendation for this zone
          const bestRecommendation = zoneRecs[0];
          
          return {
            zone,
            topRecommendations: zoneRecs.slice(0, 3),
            metrics: { 
              avgPh: bestRecommendation?.key_environmental_factors?.ph || 6.5,
              avgMoisture: 65, // Default value, could be enhanced with real sensor data
              avgTemp: 25 // Default value, could be enhanced with real sensor data
            },
            lastSensorUpdate: bestRecommendation?.createdAt || new Date().toISOString(),
            topSoilType: bestRecommendation?.key_environmental_factors?.soil_type || "Unknown",
            bestScore: bestRecommendation?.suitability_score || 0,
            location: zone.region,
          };
        })
      );
    } catch (error) {
      console.error('Error fetching real dashboard data for investor:', error);
      // Fallback to mock data if API fails
      return Promise.all(
        mockZones.map(async (zone) => {
          const recs = mockRecommendations
            .filter((r) => r.zoneId === zone.id.toString())
            .sort((a, b) => b.suitability_score - a.suitability_score);

          const data = mockSensorData.filter((d) => d.zone_id === zone.id.toString());
          const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
          const avgPh = Number(avg(data.map((d) => d.ph)).toFixed(2));
          const avgMoisture = Number(avg(data.map((d) => d.soil_moisture)).toFixed(2));
          const avgTemp = Number(avg(data.map((d) => d.temperature)).toFixed(2));
          const lastSensorUpdate = data.length ? new Date(Math.max(...data.map((d) => new Date(d.read_from_iot_at).getTime()))).toISOString() : "";
          const topSoilType = recs[0]?.key_environmental_factors.soil_type ?? "Unknown";
          const bestScore = recs[0]?.suitability_score ?? 0;
          const location = zone.region;

          return {
            zone,
            topRecommendations: recs.slice(0, 3),
            metrics: { avgPh, avgMoisture, avgTemp },
            lastSensorUpdate,
            topSoilType,
            bestScore,
            location,
          };
        })
      );
    }
  }

  if (role === "zone_admin" && user?.zone_id) {
    const recs = mockRecommendations.filter((r) => r.zoneId === user.zone_id);
    const farmersInZone = mockFarmers.filter((f) => f.zone_id === user.zone_id);
    const activeDevices = mockDevices.filter((d) => d.zone_id === user.zone_id && d.status === "online");
    return {
      stats: {
        totalFarmers: farmersInZone.length,
        activeDevices: activeDevices.length,
        latestRecommendationStatus: recs
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.status ?? "pending",
      },
      recentRecommendations: recs
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    };
  }

  if (role === "central_admin") {
    return {
      zones: mockZones,
      technicians: mockTechnicians,
      iotHealth: mockZones.map((z) => ({ zoneId: z.id, status: Math.random() > 0.2 ? "online" : "degraded" })),
    };
  }

  return null;
}

export async function getFarmersByZone(zoneId: string): Promise<Farmer[]> {
  return mockFarmers.filter((f) => f.zone_id === zoneId);
}

export async function createFarmer(farmer: Omit<Farmer, "id">): Promise<Farmer> {
  const newFarmer: Farmer = { ...farmer, id: Math.floor(Math.random() * 10000) + 1000 };
  mockFarmers.push(newFarmer);
  return newFarmer;
}

export async function updateFarmer(id: string, updates: Partial<Omit<Farmer, "id">>): Promise<Farmer | null> {
  const idx = mockFarmers.findIndex((f) => f.id === parseInt(id));
  if (idx === -1) return null;
  mockFarmers[idx] = { ...mockFarmers[idx], ...updates };
  return mockFarmers[idx];
}

export async function deleteFarmer(id: string): Promise<boolean> {
  const idx = mockFarmers.findIndex((f) => f.id === parseInt(id));
  if (idx === -1) return false;
  mockFarmers.splice(idx, 1);
  return true;
}


