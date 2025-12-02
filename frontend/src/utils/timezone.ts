// Timezone utility functions
// Since the database now stores local time (UTC+7), we need to handle it correctly

/**
 * Formats a timestamp from the database (which is already in local time UTC+7)
 * without applying additional timezone conversion
 */
export function formatLocalTime(timestamp: string): string {
  // The timestamp from database is already in local time (UTC+7)
  // But it has 'Z' suffix which makes JavaScript think it's UTC
  // We need to remove the 'Z' and treat it as local time
  
  // Remove 'Z' suffix and replace with '+07:00' to indicate it's already in UTC+7
  const localTimestamp = timestamp.replace('Z', '+07:00');
  const date = new Date(localTimestamp);
  
  // Format without additional timezone conversion
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Formats a timestamp for display in the timeline
 */
export function formatTimelineTime(timestamp: string): string {
  return formatLocalTime(timestamp);
}

/**
 * Formats a timestamp for display in comments with language support
 * @param timestamp - The timestamp string from database
 * @param language - The current language ('en' or 'th') - not used, kept for compatibility
 * @returns Formatted string: "01/01/2025 14:30:45"
 */
export function formatUITime(timestamp: string, language: 'en' | 'th' = 'en'): string {
  // The timestamp from database is already in local time (UTC+7)
  // But it has 'Z' suffix which makes JavaScript think it's UTC
  // We need to remove the 'Z' and replace with '+07:00' to indicate it's already in UTC+7
  const localTimestamp = timestamp.replace('Z', '+07:00');
  const date = new Date(localTimestamp);
  
  // Standard format: dd/mm/yyyy hh:mm:ss (same for all languages)
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Converts a database timestamp (UTC+7 with 'Z' suffix) to datetime-local input format
 * @param timestamp - The timestamp string from database (e.g., "2025-01-12T16:03:00Z")
 * @returns Formatted string for datetime-local input: "2025-01-12T16:03"
 */
export function timestampToDatetimeLocal(timestamp: string): string {
  // The timestamp from database is already in local time (UTC+7)
  // But it has 'Z' suffix which makes JavaScript think it's UTC
  // We need to remove the 'Z' and replace with '+07:00' to indicate it's already in UTC+7
  const localTimestamp = timestamp.replace('Z', '+07:00');
  const date = new Date(localTimestamp);
  
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}