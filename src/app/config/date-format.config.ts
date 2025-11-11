import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { Injectable } from '@angular/core';

/**
 * Custom date format configuration for DD/MM/YYYY format
 */
export const DD_MM_YYYY_FORMAT = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

/**
 * Custom DateAdapter that formats dates as DD/MM/YYYY
 */
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: string): string {
    if (displayFormat === 'DD/MM/YYYY') {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${this._to2digit(day)}/${this._to2digit(month)}/${year}`;
    } else if (displayFormat === 'DD/MM/YYYY HH:mm') {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${this._to2digit(day)}/${this._to2digit(month)}/${year} ${this._to2digit(hours)}:${this._to2digit(minutes)}`;
    } else if (displayFormat === 'MMM YYYY') {
      const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    } else if (displayFormat === 'MMMM YYYY') {
      const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                         'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }

  override parse(value: string): Date | null {
    if (!value || value.trim() === '') {
      return null;
    }
    
    // Try to parse DD/MM/YYYY format
    const dateParts = value.trim().split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(dateParts[2], 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && month >= 0 && month < 12) {
        const date = new Date(year, month, day);
        // Validate the date
        if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
          return date;
        }
      }
    }
    
    // Fallback to default parsing
    return super.parse(value);
  }

  private _to2digit(n: number): string {
    return ('00' + n).slice(-2);
  }
}

