/**
 * URL utility functions for handling API endpoints and uploads
 */

/**
 * Gets the base API URL from environment variables
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
}

/**
 * Gets the uploads base URL for serving static files
 * Handles both relative and absolute URLs properly
 */
export function getUploadsBaseUrl(): string {
  const apiUrl = getApiBaseUrl();
  
  // If it's a relative URL (starts with /), return it as is
  if (apiUrl.startsWith('/')) {
    return apiUrl.replace('/api', '');
  }
  
  // If it's an absolute URL, remove /api suffix
  return apiUrl.replace(/\/$/, '').replace(/\/api$/, '');
}

/**
 * Gets the full URL for an avatar or upload file
 * @param filePath - The file path (e.g., "/uploads/avatars/user.jpg")
 * @returns The complete URL for the file
 */
export function getFileUrl(filePath: string): string {
  if (!filePath) return '';
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Ensure filePath starts with /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  
  return `${getUploadsBaseUrl()}${normalizedPath}`;
}

/**
 * Gets the avatar URL for a user
 * @param avatarUrl - The avatar URL from the user object
 * @returns The complete avatar URL
 */
export function getAvatarUrl(avatarUrl?: string): string | undefined {
  if (!avatarUrl) return undefined;
  return getFileUrl(avatarUrl);
}
