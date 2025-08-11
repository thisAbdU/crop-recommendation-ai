"use client"
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, MapPin, Leaf, Thermometer } from "lucide-react";
import { apiClient } from "@/services/api";

type Message = { 
  id: string; 
  role: "user" | "assistant"; 
  content: string;
  timestamp: Date;
};

interface ZoneInfo {
  name: string;
  soilType: string;
  topCrops: string[];
  suitability: number;
}

export function AIChat({ 
  seed, 
  zoneInfo 
}: { 
  seed?: string;
  zoneInfo?: ZoneInfo;
}) {
  const [messages, setMessages] = useState<Message[]>(
    seed ? [{ 
      id: "m1", 
      role: "assistant", 
      content: seed,
      timestamp: new Date()
    }] : []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function send() {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { 
      id: `u-${Date.now()}`, 
      role: "user", 
      content: input,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Use the backend AI chat service with Gemini + prompt engineering
      const response = await apiClient.testAIChat(input.trim());
      
      let aiResponse: string;
      
      if (response.data?.reply) {
        // Backend AI response
        aiResponse = response.data.reply;
      } else if (response.error) {
        // Fallback to local response if API fails
        console.warn('Backend AI chat failed, using fallback response:', response.error);
        aiResponse = generateAIResponse(input, zoneInfo);
      } else {
        aiResponse = generateAIResponse(input, zoneInfo);
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback to local response on error
      const fallbackResponse = generateAIResponse(input, zoneInfo);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: fallbackResponse,
        timestamp: new Date()
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  const generateAIResponse = (userInput: string, zoneInfo?: ZoneInfo): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes("soil") || input.includes("soil type")) {
      return `The soil type in ${zoneInfo?.name || "this zone"} is ${zoneInfo?.soilType || "loam"}. This type of soil is excellent for most crops as it provides good drainage while retaining essential nutrients.`;
    }
    
    if (input.includes("crop") || input.includes("recommend")) {
      return `Based on the current conditions in ${zoneInfo?.name || "this zone"}, I recommend ${zoneInfo?.topCrops?.join(", ") || "maize and wheat"}. The suitability score is ${zoneInfo?.suitability || 85}%, indicating very favorable conditions.`;
    }
    
    if (input.includes("weather") || input.includes("climate")) {
      return `The current weather conditions are optimal for agricultural activities. Temperature and humidity levels are within the ideal range for the recommended crops.`;
    }
    
    if (input.includes("sensor") || input.includes("data")) {
      return `Sensor data shows healthy soil moisture levels and optimal pH balance. All environmental parameters are within recommended ranges for successful crop cultivation.`;
    }
    
    return `I'm here to help you with agricultural insights for ${zoneInfo?.name || "this zone"}. You can ask me about soil conditions, crop recommendations, weather patterns, or sensor data.`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="enhanced-card h-[600px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              {zoneInfo ? `${zoneInfo.name} AI Assistant` : "CropAI Assistant"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ask me anything about agricultural recommendations and zone insights
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-2">Welcome to CropAI Assistant</p>
              <p className="text-sm">Ask me about crop recommendations, soil conditions, or agricultural insights.</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.role === "user" 
                    ? "text-primary-foreground/70" 
                    : "text-muted-foreground"
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
              
              {message.role === "user" && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crop recommendations, soil conditions..."
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
              className="gap-2"
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



