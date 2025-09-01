export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      throw new ApiError(
        `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        response.status,
        response
      );
    }

    if (!response.ok) {
      const errorMessage = isJson && data.error 
        ? data.error 
        : `HTTP ${response.status}: ${response.statusText}`;
      
      throw new ApiError(errorMessage, response.status, response);
    }

    if (isJson && data.success === false) {
      throw new ApiError(data.error || 'API request failed', response.status, response);
    }

    return isJson ? data.data || data : data;
  }

  private buildUrl(path: string, params?: Record<string, string | number>): string {
    const url = new URL(path, window.location.origin + this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(
    path: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(
    path: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(
    path: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    return this.handleResponse<T>(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Convenience functions for common API patterns
export const adminApi = {
  getPendingRequests: (limit?: number, offset?: number) => {
    const params: any = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    return apiClient.get('/admin/pending-requests', params);
  },
    
  approveRequest: (requestId: string) =>
    apiClient.post(`/leave/request/${requestId}/approve`),
    
  rejectRequest: (requestId: string, reason?: string) =>
    apiClient.post(`/leave/request/${requestId}/reject`, { reason }),
    
  getEmployeeBalances: () =>
    apiClient.get('/admin/employee-balances'),
};

export const calendarApi = {
  getTeamLeave: (month: number, year: number) =>
    apiClient.get('/api/calendar/team-leave', { month, year }),
};

export const leaveApi = {
  getRequests: (status?: string, page?: number, limit?: number) => {
    const params: any = {};
    if (status !== undefined) params.status = status;
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    return apiClient.get('/leave/requests', params);
  },
    
  createRequest: (requestData: any) =>
    apiClient.post('/leave/request', requestData),
    
  updateRequest: (requestId: string, requestData: any) =>
    apiClient.put(`/leave/request/${requestId}`, requestData),
    
  deleteRequest: (requestId: string) =>
    apiClient.delete(`/leave/request/${requestId}`),
};