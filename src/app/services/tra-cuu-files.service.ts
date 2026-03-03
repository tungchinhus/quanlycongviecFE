import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TraCuuFilesSearchResult {
  /** Tên file TBKT (hiển thị ở cột "TBKT file"). */
  name?: string;
  /** Đường dẫn / URL TBKT (hiển thị ở cột "TBKT url"). */
  path?: string;
  /** Đường dẫn đầy đủ từ backend (có thể UNC) dùng để mở Explorer. */
  fullPath?: string;
  /** Tên file BOM (cột "Tên file BOM"). */
  bomName?: string;
  /** Đường dẫn BOM (cột "Đường dẫn BOM"). */
  bomPath?: string;
  [key: string]: unknown;
}

export interface TraCuuFilesApiResponse {
  files?: string[];
  results?: TraCuuFilesSearchResult[];
  /** Số bản ghi trong index theo folder (trước khi lọc từ khóa). Để gợi ý khi results rỗng. */
  candidatesCount?: number;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class TraCuuFilesService {
  /** Python service trên SERVER: search + indexer. */
  private get serverBaseUrl(): string {
    const env = environment as { pythonServerUrl?: string; pythonServiceUrl?: string };
    return env.pythonServerUrl ?? env.pythonServiceUrl ?? 'http://localhost:8000';
  }

  /** Python helper trên CLIENT: mở Explorer / chọn folder. */
  private get clientBaseUrl(): string {
    const env = environment as { pythonClientUrl?: string };
    return env.pythonClientUrl ?? 'http://localhost:8001';
  }

  constructor(private http: HttpClient) {}

  private readonly requestTimeoutMs = 30000;

  /**
   * Gọi API Python service tìm kiếm file theo đường dẫn folder và từ khóa.
   * useAi=true: Python dùng AI chuyển câu tự nhiên thành từ khóa.
   */
  search(folderPath: string, query: string, useAi = false): Observable<TraCuuFilesApiResponse> {
    const params = new HttpParams()
      .set('folderPath', folderPath)
      .set('q', query)
      .set('useAi', String(useAi));
    return this.http
      .get<TraCuuFilesApiResponse>(`${this.serverBaseUrl}/search`, { params })
      .pipe(timeout(this.requestTimeoutMs));
  }

  /**
   * Gọi API Python để mở hộp thoại chọn thư mục (native Windows) và trả về đường dẫn đầy đủ.
   * GET /pick-folder → { path: "M:\\..." | null }
   */
  pickFolder(): Observable<{ path: string | null; error?: string }> {
    return this.http
      .get<{ path: string | null; error?: string }>(`${this.clientBaseUrl}/pick-folder`)
      .pipe(timeout(90000)); // 90 giây — tránh spinner quay vô hạn; nếu hộp thoại mở phía sau sẽ kịp chọn
  }

  /**
   * Gọi API Python để mở Explorer và focus đúng file/folder.
   * GET /open-in-explorer?path=... (path = đường dẫn đầy đủ tới file).
   */
  openInExplorer(fullPath: string): Observable<{ ok: boolean; error?: string }> {
    const params = new HttpParams().set('path', fullPath);
    return this.http
      .get<{ ok: boolean; error?: string }>(`${this.clientBaseUrl}/open-in-explorer`, { params })
      .pipe(timeout(this.requestTimeoutMs));
  }

  /**
   * Kích hoạt chạy indexer ngay lập tức (Python service GET /index/trigger).
   * Index chạy nền, API trả về ngay.
   */
  triggerIndexNow(): Observable<{ ok: boolean; message?: string; error?: string }> {
    return this.http
      .get<{ ok: boolean; message?: string; error?: string }>(`${this.serverBaseUrl}/index/trigger`)
      .pipe(timeout(15000));
  }

  /**
   * Trạng thái lần chạy indexer gần nhất (GET /index/status).
   * status: idle | running | success | error
   */
  getIndexStatus(): Observable<IndexStatus> {
    return this.http
      .get<IndexStatus>(`${this.serverBaseUrl}/index/status`)
      .pipe(timeout(10000));
  }
}

export interface IndexStatus {
  lastRunAt: string | null;
  status: 'idle' | 'running' | 'success' | 'error';
  lastError: string | null;
  lastMessage: string | null;
  lastTotal: number | null;
  /** Số bản ghi thực tế trong DB (số file unique), khớp với SELECT COUNT(*) FROM FileIndex */
  lastStoredCount: number | null;
  lastDurationSec: number | null;
}
