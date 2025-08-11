"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZoneAIChat } from "@/components/chat/zone-ai-chat";
import { AIChat } from "@/components/chat/ai-chat";
import { RecommendationChat } from "@/components/chat/recommendation-chat";
import { apiClient } from "@/services/api";

export default function ChatTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testBackendConnection = async () => {
    try {
      addTestResult("Testing backend connection...");
      const response = await apiClient.get('/api/health');
      if (response.data) {
        addTestResult("✅ Backend connection successful");
      } else {
        addTestResult("❌ Backend connection failed");
      }
    } catch (error) {
      addTestResult(`❌ Backend connection error: ${error}`);
    }
  };

  const testPublicChat = async () => {
    try {
      addTestResult("Testing public chat endpoint...");
      const response = await apiClient.testPublicChat("Hello, test message");
      if (response.data) {
        addTestResult("✅ Public chat endpoint working");
      } else {
        addTestResult("❌ Public chat endpoint failed");
      }
    } catch (error) {
      addTestResult(`❌ Public chat error: ${error}`);
    }
  };

  const testAIStatus = async () => {
    try {
      addTestResult("Testing AI status endpoint...");
      const response = await apiClient.getAIStatus();
      if (response.data) {
        addTestResult("✅ AI status endpoint working");
      } else {
        addTestResult("❌ AI status endpoint failed");
      }
    } catch (error) {
      addTestResult(`❌ AI status error: ${error}`);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Mock data for testing
  const mockZoneInfo = {
    name: "Test Zone",
    soilType: "Loam",
    topCrops: ["Maize", "Wheat", "Soybeans"],
    suitability: 85,
    zoneId: "1"
  };

  const mockCrops = [
    {
      crop_name: "Maize",
      key_environmental_factors: {
        moisture_optimal: "60-80%",
        ph_optimal: "6.0-7.0",
        temperature_optimal: "20-30°C"
      },
      probability: 0.9,
      rank: 1,
      rationale_text: "Optimal soil conditions and climate",
      soil_type: "Loam",
      suitability_score: 85
    },
    {
      crop_name: "Wheat",
      key_environmental_factors: {
        moisture_optimal: "50-70%",
        ph_optimal: "6.0-7.5",
        temperature_optimal: "15-25°C"
      },
      probability: 0.8,
      rank: 2,
      rationale_text: "Good soil type match",
      soil_type: "Loam",
      suitability_score: 78
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chat Integration Test</h1>
        <div className="flex gap-2">
          <Button onClick={testBackendConnection} variant="outline">
            Test Backend
          </Button>
          <Button onClick={testPublicChat} variant="outline">
            Test Public Chat
          </Button>
          <Button onClick={testAIStatus} variant="outline">
            Test AI Status
          </Button>
          <Button onClick={clearTestResults} variant="outline">
            Clear Results
          </Button>
        </div>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground">No test results yet. Run some tests above.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Components Test */}
      <Tabs defaultValue="zone" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="zone">Zone Chat</TabsTrigger>
          <TabsTrigger value="ai">AI Chat</TabsTrigger>
          <TabsTrigger value="recommendation">Recommendation Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="zone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zone AI Chat Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test zone-specific chat with backend integration
              </p>
            </CardHeader>
            <CardContent>
              <ZoneAIChat
                zoneInfo={mockZoneInfo}
                onGenerateRecommendation={(start, end) => {
                  addTestResult(`Recommendation requested: ${start} to ${end}`);
                }}
                recentSensorData={[
                  {
                    id: 1,
                    zone_id: "1",
                    read_from_iot_at: new Date().toISOString(),
                    temperature: 24,
                    humidity: 70,
                    soil_moisture: 65,
                    ph: 6.5,
                    nitrogen: 45,
                    phosphorus: 30,
                    potassium: 25,
                    rainfall: 0
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Chat Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test general AI chat with backend integration
              </p>
            </CardHeader>
            <CardContent>
              <AIChat zoneInfo={mockZoneInfo} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendation Chat Test</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test recommendation-specific chat with backend integration
              </p>
            </CardHeader>
            <CardContent>
              <RecommendationChat
                recommendationId={1}
                zoneName={mockZoneInfo.name}
                crops={mockCrops}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 