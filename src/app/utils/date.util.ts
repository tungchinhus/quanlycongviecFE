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
