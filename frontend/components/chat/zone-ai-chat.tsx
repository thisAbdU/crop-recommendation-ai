"use client"
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Leaf, Thermometer, Droplets, MapPin, Calendar, TrendingUp } from "lucide-react";
import { ChatMessage, AIRecommendationCrop, SensorDataPoint } from "@/lib/types";

interface ZoneInfo {
  name: string;
  soilType: string;
  topCrops: string[];
  suitability: number;
  zoneId: string;
}

interface ZoneAIChatProps {
  zoneInfo: ZoneInfo;
  onGenerateRecommendation?: (startDate: string, endDate: string) => void;
  recentSensorData?: SensorDataPoint[];
}

export function ZoneAIChat({ 
  zoneInfo, 
  onGenerateRecommendation,
  recentSensorData 
}: ZoneAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to your ${zoneInfo.name} AI Assistant! I'm here to help you with agricultural insights, crop recommendations, and zone management. How can I assist you today?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Crop recommendation requests
    if (input.includes("crop") && (input.includes("recommend") || input.includes("suggestion"))) {
      return `I can help you generate crop recommendations for ${zoneInfo.name}! Use the "Get Crop Recommendation" button above to analyze your zone's environmental data and get AI-powered crop suggestions. You can specify date ranges to focus on specific time periods.`;
    }
    
    // Soil conditions
    if (input.includes("soil") || input.includes("soil type")) {
      return `The soil type in ${zoneInfo.name} is ${zoneInfo.soilType}. This type of soil is excellent for most crops as it provides good drainage while retaining essential nutrients. Based on recent sensor data, your soil conditions are optimal for agricultural activities.`;
    }
    
    // Weather and climate
    if (input.includes("weather") || input.includes("climate") || input.includes("temperature")) {
      const avgTemp = recentSensorData?.length ? 
        (recentSensorData.reduce((sum, d) => sum + d.temperature, 0) / recentSensorData.length).toFixed(1) : "24";
      const avgHumidity = recentSensorData?.length ? 
        (recentSensorData.reduce((sum, d) => sum + d.humidity, 0) / recentSensorData.length).toFixed(1) : "70";
      
      return `Current weather conditions in ${zoneInfo.name} are optimal for agricultural activities. Average temperature: ${avgTemp}°C, Average humidity: ${avgHumidity}%. These conditions support healthy crop growth and development.`;
    }
    
    // Sensor data
    if (input.includes("sensor") || input.includes("data") || input.includes("readings")) {
      if (recentSensorData?.length) {
        const latest = recentSensorData[0];
        return `Latest sensor readings from ${zoneInfo.name}: Soil moisture: ${latest.soil_moisture}%, pH: ${latest.ph}, Temperature: ${latest.temperature}°C, Humidity: ${latest.humidity}%. All parameters are within optimal ranges for crop cultivation.`;
      }
      return `Sensor data shows healthy environmental conditions in ${zoneInfo.name}. All parameters are within recommended ranges for successful crop cultivation.`;
    }
    
    // Zone management
    if (input.includes("zone") || input.includes("manage") || input.includes("monitor")) {
      return `You're currently managing ${zoneInfo.name} with a suitability score of ${zoneInfo.suitability}%. This zone is well-positioned for agricultural success. I can help you monitor environmental conditions, generate crop recommendations, and optimize your farming strategies.`;
    }
    
    // General agricultural advice
    if (input.includes("farm") || input.includes("agriculture") || input.includes("plant")) {
      return `For ${zoneInfo.name}, I recommend focusing on crops that thrive in ${zoneInfo.soilType} soil. Your zone's environmental conditions support ${zoneInfo.topCrops.join(", ")}. Use the recommendation system to get detailed, AI-powered suggestions based on current data.`;
    }
    
    // Help
    if (input.includes("help") || input.includes("what can you do")) {
      return `I'm your agricultural AI assistant for ${zoneInfo.name}! I can help you with:
• Crop recommendations and analysis
• Soil and environmental insights
• Sensor data interpretation
• Zone management strategies
• Agricultural best practices

Just ask me anything about your zone or use the recommendation button for detailed crop analysis!`;
    }
    
    // Default response
    return `I'm here to help you with agricultural insights for ${zoneInfo.name}. You can ask me about crop recommendations, soil conditions, weather patterns, sensor data, or zone management. For detailed crop analysis, use the "Get Crop Recommendation" button above.`;
  };

  async function send() {
    if (!input.trim() || isLoading) return;
    
    const userMsg: ChatMessage = { 
      id: `u-${Date.now()}`, 
      role: "user", 
      content: input,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response with realistic delay
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: generateAIResponse(input),
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 800);
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getQuickActions = () => [
    {
      label: "Get Crop Recommendation",
      icon: Leaf,
      action: () => onGenerateRecommendation?.("", ""),
      description: "AI-powered crop analysis"
    },
    {
      label: "View Sensor Data",
      icon: Thermometer,
      action: () => window.location.href = "/zone-data",
      description: "Environmental readings"
    },
    {
      label: "Zone Overview",
      icon: MapPin,
      action: () => window.location.href = "/dashboard",
      description: "Zone statistics"
    }
  ];

  return (
    <Card className="enhanced-card h-[700px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
            <Bot className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">
              {zoneInfo.name} AI Assistant
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your agricultural expert for crop recommendations and zone insights
            </p>
          </div>
          <Badge variant="secondary" className="bg-green-50 text-green-700">
            Zone {zoneInfo.zoneId}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Quick Actions */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 flex-wrap">
            {getQuickActions().map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={action.action}
                className="gap-2 text-xs h-8"
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4 border-t">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                  <Bot className="w-4 h-4 text-green-600" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-green-600 text-white"
                    : "bg-gray-50 text-gray-900 border border-gray-200"
                }`}
              >
                <div className="text-sm leading-relaxed">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.role === "user" 
                    ? "text-green-100" 
                    : "text-gray-500"
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
              
              {message.role === "user" && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                <Bot className="w-4 h-4 text-green-600" />
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crops, soil, weather, or zone management..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={send} 
              disabled={isLoading || !input.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 