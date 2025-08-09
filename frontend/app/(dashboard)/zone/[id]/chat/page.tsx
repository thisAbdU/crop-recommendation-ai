"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadAuth } from "@/lib/auth";
import { AIChat } from "@/components/chat/ai-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Leaf, Thermometer, Calendar } from "lucide-react";

interface ZoneData {
  id: string;
  name: string;
  topSoilType: string;
  topRecommendations: Array<{ crop_name: string }>;
  bestScore: number;
  lastSensorUpdate: string;
}

export default function ZoneChatPage() {
  const params = useParams();
  const router = useRouter();
  const [zoneData, setZoneData] = useState<ZoneData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    // Simulate fetching zone data
    setTimeout(() => {
      setZoneData({
        id: params.id as string,
        name: "Green Valley",
        topSoilType: "Loam",
        topRecommendations: [
          { crop_name: "Maize" },
          { crop_name: "Wheat" }
        ],
        bestScore: 82,
        lastSensorUpdate: new Date().toISOString()
      });
      setLoading(false);
    }, 500);
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading zone information...</p>
        </div>
      </div>
    );
  }

  if (!zoneData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Zone not found</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuitabilityClass = (score: number) => {
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Zone Information Card */}
        <div className="lg:col-span-1">
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">{zoneData.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Agricultural Zone</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100">
                    <Leaf className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Top Crops</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {zoneData.topRecommendations.map((crop, index) => (
                        <span key={index} className="crop-tag">
                          {crop.crop_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                    <Thermometer className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Suitability Score</p>
                    <span className={`suitability-score ${getSuitabilityClass(zoneData.bestScore)}`}>
                      {zoneData.bestScore}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100">
                    <MapPin className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Soil Type</p>
                    <span className="zone-badge">{zoneData.topSoilType}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Update</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(zoneData.lastSensorUpdate)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <AIChat
            seed={`Welcome to ${zoneData.name}! I'm your AI assistant for this agricultural zone. I can help you with crop recommendations, soil analysis, weather insights, and sensor data interpretation. What would you like to know about ${zoneData.name}?`}
            zoneInfo={{
              name: zoneData.name,
              soilType: zoneData.topSoilType,
              topCrops: zoneData.topRecommendations.map(r => r.crop_name),
              suitability: zoneData.bestScore
            }}
          />
        </div>
      </div>
    </div>
  );
} 