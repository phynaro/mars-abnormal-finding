import { getApiBaseUrl } from '@/utils/url';

export interface AccessRequestData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  lineId: string;
}

export interface AccessRequestStatus {
  success: boolean;
  hasPendingRequest: boolean;
  request?: {
    requestId: number;
    firstName: string;
    lastName: string;
    email: string;
    telephone: string;
    lineId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
}

export interface AccessRequestResponse {
  success: boolean;
  message: string;
  requestId?: number;
  createdAt?: string;
}

// Export the service as default as well
const accessRequestService = {
  /**
   * Check if a LINE ID has a pending access request
   */
  async checkStatus(lineId: string): Promise<AccessRequestStatus> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/access-request/check-status/${encodeURIComponent(lineId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to check request status');
      }

      return result;
    } catch (error) {
      console.error('Error checking access request status:', error);
      throw error;
    }
  },

  /**
   * Submit a new access request
   */
  async submitRequest(data: AccessRequestData): Promise<AccessRequestResponse> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/access-request/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit access request');
      }

      return result;
    } catch (error) {
      console.error('Error submitting access request:', error);
      throw error;
    }
  },

  /**
   * Get all access requests (admin only)
   */
  async getAllRequests(): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${getApiBaseUrl()}/access-request/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get access requests');
      }

      return result;
    } catch (error) {
      console.error('Error getting access requests:', error);
      throw error;
    }
  }
};

export { accessRequestService };
export default accessRequestService;