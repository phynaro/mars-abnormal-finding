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
 * Formats a timestamp for display in comments
 */
export function formatCommentTime(timestamp: string): string {
  return formatLocalTime(timestamp);
}
