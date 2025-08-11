'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Leaf, Calendar, MapPin, TrendingUp, BarChart3, MessageCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { AIRecommendationCrop } from '@/lib/types';
import { RecommendationChat } from '@/components/chat/recommendation-chat';

interface RecommendationData {
  id: number;
  zone_id: number;
  zone_name: string;
  generated_at: string;
  recommendation_data: {
    crops: AIRecommendationCrop[];
    confidence: number;
    data_quality: any;
    summary?: string;
  };
  data_start_date?: string;
  data_end_date?: string;
}

export default function RecommendationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchRecommendation();
    }
  }, [params.id]);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<RecommendationData>(`/api/recommendations/${params.id}`);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setRecommendation(response.data);
      }
    } catch (err) {
      setError('Failed to fetch recommendation details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || 'Recommendation not found'}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crop Recommendation</h1>
          <p className="text-gray-600">Zone: {recommendation.zone_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommendation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-600" />
                AI Crop Analysis
              </CardTitle>
              <CardDescription>
                Generated on {formatDate(recommendation.generated_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Confidence Score */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">AI Confidence</span>
                </div>
                <Badge className={getConfidenceColor(recommendation.recommendation_data.confidence)}>
                  {recommendation.recommendation_data.confidence.toFixed(1)}%
                </Badge>
              </div>

              {/* Date Range */}
              {(recommendation.data_start_date || recommendation.data_end_date) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Data analyzed from{' '}
                    {recommendation.data_start_date ? formatDate(recommendation.data_start_date) : 'beginning'} 
                    {' '}to{' '}
                    {recommendation.data_end_date ? formatDate(recommendation.data_end_date) : 'present'}
                  </span>
                </div>
              )}

              {/* Summary */}
              {recommendation.recommendation_data.summary && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Analysis Summary</h4>
                  <p className="text-blue-800 text-sm">{recommendation.recommendation_data.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Crop Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Recommended Crops
              </CardTitle>
              <CardDescription>
                Ranked by suitability score for your zone conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendation.recommendation_data.crops.map((crop, index) => (
                  <div key={crop.crop_name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <h3 className="font-semibold text-lg capitalize">{crop.crop_name}</h3>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {crop.suitability_score.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Soil Type:</span>
                        <p className="capitalize">{crop.soil_type}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Probability:</span>
                        <p>{(crop.probability * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Rank:</span>
                        <p>#{crop.rank}</p>
                      </div>
                    </div>

                    {crop.rationale_text && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <span className="font-medium text-gray-600">Why this crop:</span>
                        <p className="text-sm mt-1">{crop.rationale_text}</p>
                      </div>
                    )}

                    {crop.key_environmental_factors && (
                      <div className="mt-3">
                        <span className="font-medium text-gray-600">Optimal Conditions:</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-gray-500">Moisture:</span>
                            <p>{crop.key_environmental_factors.moisture_optimal}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">pH:</span>
                            <p>{crop.key_environmental_factors.ph_optimal}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Temperature:</span>
                            <p>{crop.key_environmental_factors.temperature_optimal}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - AI Chat */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Ask questions about your crop recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecommendationChat 
                recommendationId={recommendation.id}
                zoneName={recommendation.zone_name}
                crops={recommendation.recommendation_data.crops}
              />
            </CardContent>
          </Card>

          {/* Zone Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Zone Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{recommendation.zone_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Generated: {formatDate(recommendation.generated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}






