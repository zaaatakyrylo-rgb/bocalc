import { ApiResponse } from '@/types';
import { STORAGE_KEYS } from './constants';

/**
 * API Client for making requests to Cloudflare Workers backend
 */
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  }

  /**
   * Get auth token from storage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  /**
   * Get default headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || 'UNKNOWN_ERROR',
            message: data.error?.message || 'An error occurred',
            details: data.error?.details,
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to server',
          details: error,
        },
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ========================================================================
  // Authentication API
  // ========================================================================

  auth = {
    login: (email: string, password: string) =>
      this.post('/api/auth/login', { email, password }),

    register: (email: string, password: string, role?: string, vendorId?: string) =>
      this.post('/api/auth/register', { email, password, role, vendorId }),

    logout: () => this.post('/api/auth/logout'),

    refresh: () => this.post('/api/auth/refresh'),

    forgotPassword: (email: string) =>
      this.post('/api/auth/forgot-password', { email }),

    resetPassword: (token: string, password: string) =>
      this.post('/api/auth/reset-password', { token, password }),
  };

  // ========================================================================
  // Users API
  // ========================================================================

  users = {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      this.get(
        params ? `/api/users?${new URLSearchParams(params as any).toString()}` : '/api/users'
      ),

    get: (id: string) => this.get(`/api/users/${id}`),

    create: (data: any) => this.post('/api/users', data),

    update: (id: string, data: any) => this.patch(`/api/users/${id}`, data),

    delete: (id: string) => this.delete(`/api/users/${id}`),

    versions: (id: string) => this.get(`/api/users/${id}/versions`),

    restoreVersion: (id: string, version: number) =>
      this.post(`/api/users/${id}/versions/${version}/restore`),
  };

  // ========================================================================
  // Vendors API
  // ========================================================================

  vendors = {
    list: (params?: { active?: boolean; search?: string }) => {
      const qs = params ? `?${new URLSearchParams(params as any).toString()}` : '';
      return this.get(`/api/vendors${qs}`);
    },

    get: (id: string) => this.get(`/api/vendors/${id}`),

    create: (data: any) => this.post('/api/vendors', data),

    update: (id: string, data: any) => this.patch(`/api/vendors/${id}`, data),

    delete: (id: string) => this.delete(`/api/vendors/${id}`),

    versions: (id: string) => this.get(`/api/vendors/${id}/versions`),

    restoreVersion: (id: string, version: number) =>
      this.post(`/api/vendors/${id}/versions/${version}/restore`),
  };

  vendorRates = {
    list: (params: { vendorId: string; active?: boolean }) => {
      const qs = new URLSearchParams(params as any).toString();
      return this.get(`/api/vendor-rates?${qs}`);
    },
    create: (data: any) => this.post('/api/vendor-rates', data),
    update: (id: string, data: any) => this.patch(`/api/vendor-rates/${id}`, data),
    delete: (id: string) => this.delete(`/api/vendor-rates/${id}`),
    versions: (id: string) => this.get(`/api/vendor-rates/${id}/versions`),
    restoreVersion: (id: string, version: number) =>
      this.post(`/api/vendor-rates/${id}/versions/${version}/restore`),
  };

  vendorPorts = {
    list: (params: { vendorId: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return this.get(`/api/vendor-ports?${qs}`);
    },
    create: (data: any) => this.post('/api/vendor-ports', data),
    update: (id: string, data: any) => this.patch(`/api/vendor-ports/${id}`, data),
    delete: (id: string) => this.delete(`/api/vendor-ports/${id}`),
    versions: (id: string) => this.get(`/api/vendor-ports/${id}/versions`),
    restoreVersion: (id: string, version: number) =>
      this.post(`/api/vendor-ports/${id}/versions/${version}/restore`),
  };

  vendorModifiers = {
    list: (params: { vendorId: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return this.get(`/api/vendor-modifiers?${qs}`);
    },
    create: (data: any) => this.post('/api/vendor-modifiers', data),
    update: (id: string, data: any) => this.patch(`/api/vendor-modifiers/${id}`, data),
    delete: (id: string) => this.delete(`/api/vendor-modifiers/${id}`),
    versions: (id: string) => this.get(`/api/vendor-modifiers/${id}/versions`),
    restoreVersion: (id: string, version: number) =>
      this.post(`/api/vendor-modifiers/${id}/versions/${version}/restore`),
  };

  // ========================================================================
  // Calculator API
  // ========================================================================

  calculator = {
    calculate: (input: any) => this.post('/api/calculate', input),

    get: (id: string) => this.get(`/api/calculate/${id}`),

    history: () => this.get('/api/calculate/history'),

    list: (params: { vendorId: string; limit?: number }) => {
      const qs = new URLSearchParams(params as any).toString();
      return this.get(`/api/calculate?${qs}`);
    },

    update: (id: string, data: any) => this.patch(`/api/calculate/${id}`, data),

    delete: (id: string) => this.delete(`/api/calculate/${id}`),

    versions: (id: string) => this.get(`/api/calculate/${id}/versions`),

    restoreVersion: (id: string, version: number) =>
      this.post(`/api/calculate/${id}/versions/${version}/restore`),
  };

  // ========================================================================
  // Google Sheets API
  // ========================================================================

  sheets = {
    sync: () => this.post('/api/sheets/sync'),

    status: () => this.get('/api/sheets/status'),

    versions: () => this.get('/api/sheets/versions'),
  };

  // ========================================================================
  // Audit API
  // ========================================================================

  audit = {
    list: (params?: any) =>
      this.get(`/api/audit?${new URLSearchParams(params).toString()}`),

    get: (id: string) => this.get(`/api/audit/${id}`),

    export: (params?: any) =>
      this.get(`/api/audit/export?${new URLSearchParams(params).toString()}`),
  };

  // ========================================================================
  // Reference Data API
  // ========================================================================

  reference = {
    auctions: () => this.get('/api/reference/auctions'),

    ports: () => this.get('/api/reference/ports'),

    states: () => this.get('/api/reference/states'),

    bodyTypes: () => this.get('/api/reference/body-types'),
  };
}

// Export singleton instance
export const apiClient = new ApiClient();


