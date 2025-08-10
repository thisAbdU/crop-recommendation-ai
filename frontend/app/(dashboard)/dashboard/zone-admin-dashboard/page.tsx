"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { CropRecommendationGenerator } from "@/components/dashboard/crop-recommendation-generator";
import { ZoneAIChat } from "@/components/chat/zone-ai-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Users, 
  BarChart3, 
  Leaf, 
  Thermometer, 
  Droplets, 
  TrendingUp,
  Calendar,
  Bot,
  Target
} from "lucide-react";
import { getSensorDataByZone } from "@/lib/api";
import { SensorDataPoint, AIRecommendationResponse } from "@/lib/types";

export default function ZoneAdminDashboardPage() {
  const { user } = useAuth();
  const [recentSensorData, setRecentSensorData] = useState<SensorDataPoint[]>([]);
  const [zoneStats, setZoneStats] = useState({
    totalFarmers: 12,
    sensorReadings: 0,
    lastRecommendation: null as AIRecommendationResponse | null,
    zoneHealth: "Excellent"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.zone_id) {
      loadZoneData();
    }
  }, [user]);

  const loadZoneData = async () => {
    try {
      setLoading(true);
      // Load recent sensor data (last 24 hours)
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const sensorData = await getSensorDataByZone(
        user?.zone_id || "", 
        startDate, 
        endDate
      );
      
      setRecentSensorData(sensorData);
      setZoneStats(prev => ({
        ...prev,
        sensorReadings: sensorData.length
      }));
    } catch (error) {
      console.error("Failed to load zone data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationGenerated = (recommendation: AIRecommendationResponse) => {
    setZoneStats(prev => ({
      ...prev,
      lastRecommendation: recommendation
    }));
  };

  const getZoneInfo = () => ({
    name: `Zone ${user?.zone_id || "N/A"}`,
    soilType: "Clay Loam",
    topCrops: ["Corn", "Wheat", "Soybeans"],
    suitability: 92,
    zoneId: user?.zone_id || "N/A"
  });

  const getEnvironmentalSummary = () => {
    if (!recentSensorData.length) return null;
    
    const latest = recentSensorData[0];
    const avgTemp = recentSensorData.reduce((sum, d) => sum + d.temperature, 0) / recentSensorData.length;
    const avgMoisture = recentSensorData.reduce((sum, d) => sum + d.soil_moisture, 0) / recentSensorData.length;
    const avgPh = recentSensorData.reduce((sum, d) => sum + d.ph, 0) / recentSensorData.length;
    
    return {
      temperature: avgTemp.toFixed(1),
      moisture: avgMoisture.toFixed(1),
      ph: avgPh.toFixed(1),
      humidity: latest.humidity,
      nitrogen: latest.nitrogen
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your zone dashboard...</p>
        </div>
      </div>
    );
  }

  const envSummary = getEnvironmentalSummary();

  return (
    <RouteGuard requiredRole="zone_admin">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to {getZoneInfo().name}
            </h1>
            <p className="text-gray-600 mt-2">
              Your agricultural AI-powered dashboard for optimal crop management
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              Zone Health: {zoneStats.zoneHealth}
            </Badge>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Zone Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Zone Status</CardTitle>
              <MapPin className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">Active</div>
              <p className="text-xs text-green-600">
                Monitoring: {zoneStats.sensorReadings} sensors
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Farmers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {zoneStats.totalFarmers}
              </div>
              <p className="text-xs text-blue-600">
                Registered in your zone
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Soil Quality</CardTitle>
              <Leaf className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {getZoneInfo().suitability}%
              </div>
              <p className="text-xs text-orange-600">
                Agricultural suitability
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">AI Insights</CardTitle>
              <Bot className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {zoneStats.lastRecommendation ? "Ready" : "Available"}
              </div>
              <p className="text-xs text-purple-600">
                Crop recommendations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Environmental Conditions */}
        {envSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-blue-600" />
                Current Environmental Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Thermometer className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{envSummary.temperature}°C</div>
                  <div className="text-xs text-gray-500">Temperature</div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Droplets className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{envSummary.moisture}%</div>
                  <div className="text-xs text-gray-500">Soil Moisture</div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{envSummary.ph}</div>
                  <div className="text-xs text-gray-500">pH Level</div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Droplets className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{envSummary.humidity}%</div>
                  <div className="text-xs text-gray-500">Humidity</div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Leaf className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{envSummary.nitrogen} ppm</div>
                  <div className="text-xs text-gray-500">Nitrogen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Crop Recommendation Generator */}
          <div className="space-y-6">
            <CropRecommendationGenerator
              zoneId={user?.zone_id || ""}
              zoneName={getZoneInfo().name}
              onRecommendationGenerated={handleRecommendationGenerated}
            />
          </div>

          {/* AI Chatbot */}
          <div className="space-y-6">
            <ZoneAIChat
              zoneInfo={getZoneInfo()}
              recentSensorData={recentSensorData}
              onGenerateRecommendation={(startDate, endDate) => {
                // This will be handled by the recommendation generator
                console.log("Generate recommendation requested:", { startDate, endDate });
              }}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/zone-data"}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Sensor Data
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/crop-recommendations"}>
                <Leaf className="w-4 h-4 mr-2" />
                Crop Recommendations
              </Button>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Manage Farmers
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
} 