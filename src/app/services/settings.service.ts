import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SystemSettings {
  fileStoragePath: string;
  [key: string]: any; // Cho phép các settings khác trong tương lai
}

export interface UpdateSettingsRequest {
  fileStoragePath?: string;
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
    return this.http.put<SystemSettings>(`${this.apiUrl}/file-storage-path`, { fileStoragePath: path });
  }

  /**
   * Kiểm tra đường dẫn có hợp lệ không (test trên server)
   */
  validatePath(path: string): Observable<{ valid: boolean; message?: string }> {
    return this.http.post<{ valid: boolean; message?: string }>(`${this.apiUrl}/validate-path`, { path });
  }
}

