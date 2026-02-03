import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TraCuuFilesSearchResult {
  path?: string;
  name?: string;
  fullPath?: string;  // Đường dẫn đầy đủ từ backend (có thể UNC)
  [key: string]: unknown;
}

export interface TraCuuFilesApiResponse {
  files?: string[];
  results?: TraCuuFilesSearchResult[];
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class TraCuuFilesService {
  private get baseUrl(): string {
    return (environment as { pythonServiceUrl?: string }).pythonServiceUrl ?? 'http://localhost:8000';
  }

  constructor(private http: HttpClient) {}

  /** Timeout 90 giây - search ổ mạng có thể chậm. */
  private readonly requestTimeoutMs = 90000;

  /**
   * Gọi API Python service tìm kiếm file theo đường dẫn folder và từ khóa.
   * GET /search?folderPath=...&q=...
   */
  search(folderPath: string, query: string): Observable<TraCuuFilesApiResponse> {
    const params = new HttpParams()
      .set('folderPath', folderPath)
      .set('q', query);
    return this.http
      .get<TraCuuFilesApiResponse>(`${this.baseUrl}/search`, { params })
      .pipe(timeout(this.requestTimeoutMs));
  }

  /**
   * Gọi API Python để mở Explorer và focus đúng file/folder.
   * GET /open-in-explorer?path=... (path = đường dẫn đầy đủ tới file).
   */
  openInExplorer(fullPath: string): Observable<{ ok: boolean; error?: string }> {
    const params = new HttpParams().set('path', fullPath);
    return this.http
      .get<{ ok: boolean; error?: string }>(`${this.baseUrl}/open-in-explorer`, { params })
      .pipe(timeout(this.requestTimeoutMs));
  }
}
