import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SignatureInfo {
  hasSignature: boolean;
  fileSize?: number;
  lastModified?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignatureService {
  private apiUrl = `${environment.apiUrl}/UserSignature`;

  constructor(private http: HttpClient) {}

  /**
   * Upload chữ ký điện tử
   */
  uploadSignature(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Không set Content-Type header, browser sẽ tự động set multipart/form-data với boundary
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Lấy chữ ký điện tử dưới dạng blob
   */
  getSignature(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}`, { responseType: 'blob' });
  }

  /**
   * Lấy URL của chữ ký (để hiển thị trong img tag)
   */
  getSignatureUrl(): string {
    return `${this.apiUrl}?t=${Date.now()}`; // Thêm timestamp để tránh cache
  }

  /**
   * Lấy thông tin chữ ký (metadata)
   */
  getSignatureInfo(): Observable<SignatureInfo> {
    return this.http.get<SignatureInfo>(`${this.apiUrl}/info`);
  }

  /**
   * Xóa chữ ký điện tử
   */
  deleteSignature(): Observable<any> {
    return this.http.delete(`${this.apiUrl}`);
  }
}
