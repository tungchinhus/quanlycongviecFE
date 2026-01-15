/**
 * Utility functions for date formatting
 */

/**
 * Format date to DD/MM/YYYY format
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string in DD/MM/YYYY format, or '-' if invalid
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) return '-';
  
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  
  return `${padZero(day)}/${padZero(month)}/${year}`;
}

/**
 * Format date to DD/MM/YYYY HH:mm format
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string in DD/MM/YYYY HH:mm format, or '-' if invalid
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) return '-';
  
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  
  return `${padZero(day)}/${padZero(month)}/${year} ${padZero(hours)}:${padZero(minutes)}`;
}

/**
 * Pad number with leading zero
 * @param n - Number to pad
 * @returns Padded string
 */
function padZero(n: number): string {
  return ('00' + n).slice(-2);
}

/**
 * Parse date string to Date object safely, avoiding timezone issues
 * This function extracts only the date part (YYYY-MM-DD) and creates a Date object
 * in local timezone to avoid timezone conversion issues
 * 
 * @param dateString - Date string in ISO format (e.g., "2026-01-15" or "2026-01-15T00:00:00Z")
 * @returns Date object in local timezone, or null if invalid
 * 
 * @example
 * parseDateSafe("2026-01-15") -> Date object representing 2026-01-15 in local timezone
 * parseDateSafe("2026-01-15T00:00:00Z") -> Date object representing 2026-01-15 in local timezone
 */
export function parseDateSafe(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null;
  
  // If already a Date object, return as is
  if (dateString instanceof Date) {
    if (isNaN(dateString.getTime())) return null;
    return dateString;
  }
  
  // Extract date part (YYYY-MM-DD) from string
  // Handle formats like:
  // - "2026-01-15"
  // - "2026-01-15T00:00:00"
  // - "2026-01-15T00:00:00Z"
  // - "2026-01-15T00:00:00+07:00"
  const dateMatch = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    // Try to parse as regular date string
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  }
  
  // Extract year, month, day from the match
  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed in Date
  const day = parseInt(dateMatch[3], 10);
  
  // Create Date object in local timezone (not UTC)
  // This ensures the date displayed matches what's stored in DB
  const date = new Date(year, month, day);
  
  // Validate the date
  if (isNaN(date.getTime())) return null;
  
  return date;
}

/**
 * Format date to YYYY-MM-DD string (date only, no time, no timezone)
 * This ensures the date sent to backend matches exactly what user selected
 * Backend will parse this as local date without timezone conversion
 * 
 * @param date - Date object, string, or null/undefined
 * @returns Date string in YYYY-MM-DD format, or null if invalid
 * 
 * @example
 * formatDateOnly(new Date(2026, 0, 16)) -> "2026-01-16"
 * formatDateOnly("2026-01-16T00:00:00+07:00") -> "2026-01-16"
 */
export function formatDateOnly(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  let d: Date;
  if (typeof date === 'string') {
    // Parse string to Date first
    const parsed = parseDateSafe(date);
    if (!parsed) return null;
    d = parsed;
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) return null;
  
  // Format as YYYY-MM-DD (date only, no time, no timezone)
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return formatted;
}