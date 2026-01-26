import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SystemSettings {
  fileStoragePath: string;
  signatureStoragePath?: string;
  sendEmailNotifications: boolean;
  designerWarningDays?: number;
  reviewerWarningDays?: number;
  [key: string]: any; // Cho phép các settings khác trong tương lai
}

export interface UpdateSettingsRequest {
  fileStoragePath?: string;
  sendEmailNotifications?: boolean;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy tất cả settings hiện tại
   */
  getSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(this.apiUrl);
  }

  /**
   * Cập nhật settings
   */
  updateSettings(settings: UpdateSettingsRequest): Observable<SystemSettings> {
    return this.http.put<SystemSettings>(this.apiUrl, settings);
  }

  /**
   * Lấy đường dẫn lưu file hiện tại
   */
  getFileStoragePath(): Observable<{ fileStoragePath: string }> {
    return this.http.get<{ fileStoragePath: string }>(`${this.apiUrl}/file-storage-path`);
  }

  /**
   * Cập nhật đường dẫn lưu file
   */
  updateFileStoragePath(path: string): Observable<SystemSettings> {
    return this.http.put<SystemSettings>(`${this.apiUrl}/file-storage-path`, { Path: path });
  }

  /**
   * Kiểm tra đường dẫn có hợp lệ không (test trên server)
   */
  validatePath(path: string): Observable<{ valid: boolean; message?: string }> {
    return this.http.post<{ valid: boolean; message?: string }>(`${this.apiUrl}/validate-path`, { path });
  }

  /**
   * Lấy tất cả cài đặt hệ thống
   */
  getAllSystemSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.apiUrl}/all`);
  }

  /**
   * Lấy notification preference
   */
  getNotificationPreference(): Observable<{ sendEmailNotifications: boolean }> {
    return this.http.get<{ sendEmailNotifications: boolean }>(`${this.apiUrl}/notification-preference`);
  }

  /**
   * Cập nhật notification preference
   */
  updateNotificationPreference(sendEmailNotifications: boolean): Observable<{ sendEmailNotifications: boolean }> {
    return this.http.put<{ sendEmailNotifications: boolean }>(`${this.apiUrl}/notification-preference`, {
      sendEmailNotifications
    });
  }

  /**
   * Lấy warning days settings
   */
  getWarningDays(): Observable<{ designerWarningDays: number; reviewerWarningDays: number }> {
    return this.http.get<{ designerWarningDays: number; reviewerWarningDays: number }>(`${this.apiUrl}/warning-days`);
  }

  /**
   * Cập nhật warning days settings
   */
  updateWarningDays(designerWarningDays: number, reviewerWarningDays: number): Observable<{ designerWarningDays: number; reviewerWarningDays: number }> {
    return this.http.put<{ designerWarningDays: number; reviewerWarningDays: number }>(`${this.apiUrl}/warning-days`, {
      designerWarningDays,
      reviewerWarningDays
    });
  }

  /**
   * Lấy đường dẫn lưu chữ ký hiện tại
   */
  getSignatureStoragePath(): Observable<{ signatureStoragePath: string }> {
    return this.http.get<{ signatureStoragePath: string }>(`${this.apiUrl}/signature-storage-path`);
  }

  /**
   * Cập nhật đường dẫn lưu chữ ký
   */
  updateSignatureStoragePath(path: string): Observable<{ signatureStoragePath: string; message: string }> {
    return this.http.put<{ signatureStoragePath: string; message: string }>(`${this.apiUrl}/signature-storage-path`, { Path: path });
  }
}

