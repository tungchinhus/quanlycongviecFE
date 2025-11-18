import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FileDocument } from '../models/file.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  getAllFiles(): Observable<FileDocument[]> {
    return this.http.get<FileDocument[]>(this.apiUrl);
  }

  getFileById(id: number): Observable<FileDocument> {
    return this.http.get<FileDocument>(`${this.apiUrl}/${id}`);
  }

  uploadFile(file: File, assignmentId: number, description?: string): Observable<FileDocument> {
    // assignmentId là bắt buộc theo API spec
    if (!assignmentId || assignmentId <= 0) {
      throw new Error('assignmentId is required and must be greater than 0');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentId', assignmentId.toString()); // API dùng camelCase 'assignmentId'
    if (description) {
      formData.append('description', description);
    }
    
    // Không set Content-Type header, browser sẽ tự động set multipart/form-data với boundary
    return this.http.post<FileDocument>(`${this.apiUrl}/upload`, formData);
  }

  updateFile(id: number, file: Partial<FileDocument>): Observable<FileDocument> {
    return this.http.put<FileDocument>(`${this.apiUrl}/${id}`, file);
  }

  deleteFile(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }

  getFilesByAssignment(assignmentId: number): Observable<FileDocument[]> {
    // Sử dụng endpoint mới theo API spec: /api/files/byAssignment/{assignmentId}
    return this.http.get<FileDocument[]>(`${this.apiUrl}/byAssignment/${assignmentId}`);
  }
}

