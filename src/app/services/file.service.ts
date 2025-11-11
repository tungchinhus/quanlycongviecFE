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

  uploadFile(file: File, description?: string, assignmentID?: number): Observable<FileDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    if (assignmentID) {
      formData.append('assignmentID', assignmentID.toString());
    }
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

  getFilesByAssignment(assignmentID: number): Observable<FileDocument[]> {
    return this.http.get<FileDocument[]>(`${this.apiUrl}?assignmentID=${assignmentID}`);
  }
}

