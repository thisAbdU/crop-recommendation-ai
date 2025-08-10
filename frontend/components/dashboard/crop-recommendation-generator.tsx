"use client"
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Leaf, 
  Calendar, 
  Thermometer, 
  Droplets, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  Loader2,
  AlertCircle
} from "lucide-react";
import { apiClient } from "@/services/api";
import { AIRecommendationResponse, AIRecommendationCrop } from "@/lib/types";

interface CropRecommendationGeneratorProps {
  zoneId: string;
  zoneName: string;
  onRecommendationGenerated?: (recommendation: AIRecommendationResponse) => void;
}

export function CropRecommendationGenerator({ 
  zoneId, 
  zoneName,
  onRecommendationGenerated 
}: CropRecommendationGeneratorProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<AIRecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set default dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const generateRecommendation = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const response = await apiClient.generateCropRecommendation(
        parseInt(zoneId),
        startDate,
        endDate
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        setRecommendation(response.data);
        onRecommendationGenerated?.(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recommendation");
      console.error("Recommendation generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSuitabilityColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-blue-100 text-blue-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    if (score >= 60) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800";
    if (confidence >= 0.8) return "bg-blue-100 text-blue-800";
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Crop Recommendation</h2>
          <p className="text-gray-600">
            Generate AI-powered crop suggestions for {zoneName} based on environmental data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">AI Service Online</span>
        </div>
      </div>

      {/* Date Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Select Analysis Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Analysis will include sensor data, weather patterns, and soil conditions for the selected period
            </p>
            <Button
              onClick={generateRecommendation}
              disabled={isLoading || !startDate || !endDate}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Leaf className="w-4 h-4" />
                  Generate Recommendation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Results */}
      {recommendation && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Recommendation Generated Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {recommendation.data.confidence * 100}%
                  </div>
                  <div className="text-sm text-green-600">Confidence Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {recommendation.data.ai_result.crops.length}
                  </div>
                  <div className="text-sm text-green-600">Crops Recommended</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {recommendation.data.data_quality.grade}
                  </div>
                  <div className="text-sm text-green-600">Data Quality</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-green-700">
                Generated at: {formatDate(recommendation.data.generated_at)}
              </div>
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Data Quality Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`text-sm ${getConfidenceColor(recommendation.data.data_quality.score / 100)}`}>
                    Grade {recommendation.data.data_quality.grade}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Score: {recommendation.data.data_quality.score}/100
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {recommendation.data.data_quality.recommendation}
                  </div>
                  {recommendation.data.data_quality.issues.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {recommendation.data.data_quality.issues.length} issues detected
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crop Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-600" />
                Recommended Crops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendation.data.ai_result.crops.map((crop, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Leaf className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{crop.crop_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getSuitabilityColor(crop.suitability_score)}>
                              {crop.suitability_score}% Suitable
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Rank #{crop.rank}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Probability</div>
                        <div className="text-lg font-semibold text-green-600">
                          {(crop.probability * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">
                          Moisture: {crop.key_environmental_factors.moisture_optimal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-gray-600">
                          Temperature: {crop.key_environmental_factors.temperature_optimal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          pH: {crop.key_environmental_factors.ph_optimal}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed">
                      {crop.rationale_text}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                AI Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {recommendation.data.ai_result.response}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 