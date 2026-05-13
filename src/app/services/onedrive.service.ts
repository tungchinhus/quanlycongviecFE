import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OneDriveItem {
  id?: string;
  name?: string;
  path?: string;
  fullPath?: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
}

export interface OneDriveExtractApiResponse {
  item?: OneDriveItem | null;
  message?: string;
  error?: string;
}

export interface OneDriveSearchApiResponse {
  results?: OneDriveItem[];
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OneDriveService {
  private readonly backendApiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  extract(sourceUrl: string): Observable<OneDriveExtractApiResponse> {
    return this.http.post<OneDriveExtractApiResponse>(`${this.backendApiUrl}/OneDrive/extract`, {
      sourceUrl
    });
  }

  search(sourceUrl: string, query: string, maxResults = 100): Observable<OneDriveSearchApiResponse> {
    return this.http.post<OneDriveSearchApiResponse>(`${this.backendApiUrl}/OneDrive/search`, {
      sourceUrl,
      query,
      maxResults
    });
  }
}

