// frontend/src/utils/authHeaders.ts
import { authService } from '../services/authService';

/**
 * Get authentication headers for API calls
 * @param includeContentType - Whether to include Content-Type header (default: true)
 * @returns Headers object with Authorization and optional Content-Type
 */
export function getAuthHeaders(includeContentType: boolean = true): Record<string, string> {
  const token = authService.getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

/**
 * Get authentication headers without Content-Type (for file uploads, etc.)
 * @returns Headers object with Authorization only
 */
export function getAuthHeadersNoContentType(): Record<string, string> {
  return getAuthHeaders(false);
}
