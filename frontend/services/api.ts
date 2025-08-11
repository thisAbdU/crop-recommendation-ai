// API service configuration and base functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company: string;
  phone?: string;
}

export interface LoginResponse {
  user: {
    name: string;
    zone_id?: string;
    role: string;
  };
  token: string;
}

export interface SignupResponse {
  user: {
    name: string;
    email: string;
    company: string;
    role: string;
  };
  message: string;
}

// Chat message interface
export interface ChatMessageRequest {
  message: string;
  model?: string;
}

export interface ChatResponse {
  reply: string;
  thread_id?: string;
  zone_id?: number;
  zone_name?: string;
  crops?: string[];
  context_used?: string[];
}

// Base API client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      mode: 'cors', // Enable CORS
      credentials: 'omit', // Don't send cookies for cross-origin requests
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.message || `HTTP error! status: ${response.status}`,
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signup(credentials: SignupCredentials): Promise<ApiResponse<SignupResponse>> {
    return this.request<SignupResponse>('/api/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/api/auth/logout/', {
      method: 'POST',
    });
  }

  // Generic CRUD operations
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Crop recommendation endpoint
  async generateCropRecommendation(zoneId: number, startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const payload: any = { zone_id: zoneId || 1 };
    
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    
    return this.request<any>('/api/recommendations/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Chat endpoints
  async sendZoneChatMessage(zoneId: number, message: string): Promise<ApiResponse<ChatResponse>> {
    return this.post<ChatResponse>(`/api/chat/zone/${zoneId}/chat`, {
      message: message
    });
  }

  async sendRecommendationChatMessage(recommendationId: number, message: string): Promise<ApiResponse<ChatResponse>> {
    return this.post<ChatResponse>(`/api/chat/recommendation/${recommendationId}/message`, {
      message: message,
      model: 'gemini'
    });
  }

  async testAIChat(message: string): Promise<ApiResponse<any>> {
    return this.post<any>('/api/chat/ai/test', {
      message: message
    });
  }

  async getAIStatus(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/chat/ai/status');
  }

  async testPublicChat(message: string): Promise<ApiResponse<any>> {
    return this.post<any>('/api/chat/public/test', {
      message: message
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
