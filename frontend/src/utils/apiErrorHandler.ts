/**
 * API Error Handler Utility
 * Handles API errors, especially authentication-related errors like malformed JWT tokens
 */

import authService from '../services/authService';

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  requireLogin?: boolean;
}

/**
 * Handles API errors and redirects to login if necessary
 * @param response - The fetch Response object
 * @param redirectToLogin - Whether to redirect to login on auth errors (default: true)
 * @returns The error response data
 */
export async function handleApiError(
  response: Response,
  redirectToLogin: boolean = true
): Promise<ApiErrorResponse> {
  let errorData: ApiErrorResponse;

  try {
    errorData = await response.json();
  } catch (parseError) {
    // If JSON parsing fails, create a default error object
    errorData = {
      success: false,
      message: `HTTP error! status: ${response.status}`,
    };
  }

  // Check for authentication errors (401) or malformed JWT (403 with JWT_MALFORMED code)
  const isAuthError = response.status === 401 || response.status === 403;
  const isMalformedJWT = 
    errorData.code === 'JWT_MALFORMED' || 
    errorData.requireLogin === true ||
    errorData.message?.toLowerCase().includes('jwt malformed') ||
    errorData.message?.toLowerCase().includes('malformed');

  if ((isAuthError || isMalformedJWT) && redirectToLogin) {
    // Clear authentication data
    authService.logout().catch(() => {
      // Even if logout fails, clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    // Redirect to login page
    // Only redirect if we're not already on the login page
    if (!window.location.pathname.includes('/login')) {
      // Store current URL for redirect after login (optional)
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', currentUrl);
      }

      // Redirect to login
      window.location.href = '/login';
    }
  }

  return errorData;
}

/**
 * Checks if an error response indicates a malformed JWT token
 * @param errorData - The error response data
 * @returns true if the error is a malformed JWT
 */
export function isMalformedJWTError(errorData: ApiErrorResponse): boolean {
  return (
    errorData.code === 'JWT_MALFORMED' ||
    errorData.message?.toLowerCase().includes('jwt malformed') ||
    errorData.message?.toLowerCase().includes('malformed')
  );
}

/**
 * Checks if an error response indicates authentication is required
 * @param errorData - The error response data
 * @returns true if login is required
 */
export function requiresLogin(errorData: ApiErrorResponse): boolean {
  return errorData.requireLogin === true || isMalformedJWTError(errorData);
}

/**
 * Wrapper for fetch that automatically handles API errors including malformed JWT
 * Use this in services that make direct fetch calls
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns The response if successful, throws error if not
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    await handleApiError(response);
    // handleApiError may have redirected, but if not, we still need to throw
    const errorData = await response.json().catch(() => ({
      success: false,
      message: `HTTP error! status: ${response.status}`,
    }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return response;
}

