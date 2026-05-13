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
  aiAnswer?: string;
  intent?: 'file_search' | 'reasoning';
  /** Số bản ghi trong index theo folder (trước khi lọc từ khóa). Để gợi ý khi results rỗng. */
  candidatesCount?: number;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class TraCuuFilesService {
  /** API backend chính (ASP.NET). */
  private readonly backendApiUrl = environment.apiUrl;

  /** Python service trên SERVER: chỉ còn dùng cho indexer. */
  private get serverBaseUrl(): string {
    const env = environment as { pythonServerUrl?: string; pythonServiceUrl?: string };
    return env.pythonServerUrl ?? env.pythonServiceUrl ?? 'http://localhost:8100';
  }

  /** URL đang dùng cho Indexer (GET /index/status, /index/trigger). Để hiển thị trong UI khi lỗi kết nối. */
  getIndexerBaseUrl(): string {
    return this.serverBaseUrl;
  }

  /** Python helper trên CLIENT: mở Explorer / chọn folder. */
  private get clientBaseUrl(): string {
    const env = environment as { pythonClientUrl?: string };
    return env.pythonClientUrl ?? 'http://localhost:8100';
  }

  /** Endpoint mở Explorer: dùng backend khi openInExplorerUseBackend (Explorer mở trên server). */
  private get openInExplorerEndpoint(): string {
    const env = environment as { openInExplorerUseBackend?: boolean };
    if (env.openInExplorerUseBackend) {
      return `${this.backendApiUrl}/files/open-in-explorer`;
    }
    return `${this.clientBaseUrl}/open-in-explorer`;
  }

  constructor(private http: HttpClient) {}

  private readonly requestTimeoutMs = 30000;
  private readonly aiRequestTimeoutMs = 120000;
  /** Giới hạn số kết quả search giống Python (mặc định 500). */
  private readonly maxResults = 500;

  /** Từ thừa khi tách keyword (giống _SEARCH_STOPWORDS trong Python). */
  private readonly searchStopwords = new Set<string>([
    'file',
    'files',
    'có',
    'co',
    'bao',
    'nhieu',
    'nhiêu',
    'how',
    'many',
    'tat',
    'ca',
    'all',
    'tim',
    'tìm',
    'search',
    'find'
  ]);

  /** Map loại file → đuôi file (giống _FILE_TYPE_TO_EXTENSIONS trong Python, rút gọn cho FE). */
  private readonly fileTypeToExtensions: Record<string, string[]> = {
    excel: ['.xlsx', '.xls'],
    xlsx: ['.xlsx'],
    xls: ['.xls'],
    pdf: ['.pdf'],
    word: ['.doc', '.docx'],
    doc: ['.doc'],
    docx: ['.docx'],
    anh: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
    video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv'],
    mp4: ['.mp4']
  };

  /** Bỏ dấu tiếng Việt để khớp với NameNormalized trong DB (port từ _normalize_vi trong Python). */
  private normalizeVi(text: string): string {
    if (!text) return text;
    const map: Record<string, string> = {
      à: 'a', á: 'a', ạ: 'a', ả: 'a', ã: 'a',
      â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a',
      ă: 'a', ằ: 'a', ắ: 'a', ặ: 'a', ẳ: 'a', ẵ: 'a',
      À: 'a', Á: 'a', Ạ: 'a', Ả: 'a', Ã: 'a',
      Â: 'a', Ầ: 'a', Ấ: 'a', Ậ: 'a', Ẩ: 'a', Ẫ: 'a',
      Ă: 'a', Ằ: 'a', Ắ: 'a', Ặ: 'a', Ẳ: 'a', Ẵ: 'a',
      è: 'e', é: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e',
      ê: 'e', ề: 'e', ế: 'e', ệ: 'e', ể: 'e', ễ: 'e',
      È: 'e', É: 'e', Ẹ: 'e', Ẻ: 'e', Ẽ: 'e',
      Ê: 'e', Ề: 'e', Ế: 'e', Ệ: 'e', Ể: 'e', Ễ: 'e',
      ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i',
      Ì: 'i', Í: 'i', Ị: 'i', Ỉ: 'i', Ĩ: 'i',
      ò: 'o', ó: 'o', ọ: 'o', ỏ: 'o', õ: 'o',
      ô: 'o', ồ: 'o', ố: 'o', ộ: 'o', ổ: 'o', ỗ: 'o',
      ơ: 'o', ờ: 'o', ớ: 'o', ợ: 'o', ở: 'o', ỡ: 'o',
      Ò: 'o', Ó: 'o', Ọ: 'o', Ỏ: 'o', Õ: 'o',
      Ô: 'o', Ồ: 'o', Ố: 'o', Ộ: 'o', Ổ: 'o', Ỗ: 'o',
      Ơ: 'o', Ờ: 'o', Ớ: 'o', Ợ: 'o', Ở: 'o', Ỡ: 'o',
      ù: 'u', ú: 'u', ụ: 'u', ủ: 'u', ũ: 'u',
      ư: 'u', ừ: 'u', ứ: 'u', ự: 'u', ử: 'u', ữ: 'u',
      Ù: 'u', Ú: 'u', Ụ: 'u', Ủ: 'u', Ũ: 'u',
      Ư: 'u', Ừ: 'u', Ứ: 'u', Ự: 'u', Ử: 'u', Ữ: 'u',
      ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y',
      Ỳ: 'y', Ý: 'y', Ỵ: 'y', Ỷ: 'y', Ỹ: 'y',
      đ: 'd', Đ: 'd'
    };
    return text
      .split('')
      .map((ch) => map[ch] ?? ch)
      .join('');
  }

  /**
   * Build query params cho API backend /settings/search-file-index
   * sao cho gần giống logic Python (_search_via_backend_api).
   */
  private buildBackendSearchParams(folderPath: string, query: string): HttpParams {
    const rawKeywords = (query || '')
      .split(/\s+/)
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const extFilters = new Set<string>();
    const nameKeywords: string[] = [];

    for (const kw of rawKeywords) {
      if (kw.startsWith('.')) {
        extFilters.add(kw);
        continue;
      }
      const mapped = this.fileTypeToExtensions[kw];
      if (mapped && mapped.length) {
        mapped.forEach((e) => extFilters.add(e));
        continue;
      }
      if (!this.searchStopwords.has(kw)) {
        nameKeywords.push(kw);
      }
    }

    const normalizedKeywords = nameKeywords
      .map((k) => this.normalizeVi(k))
      .filter(Boolean);

    let params = new HttpParams()
      .set('folderPath', folderPath.trim())
      .set('maxResults', String(this.maxResults));

    if (normalizedKeywords.length > 0) {
      params = params.set('q', normalizedKeywords.join(' '));
    }
    if (extFilters.size > 0) {
      params = params.set('ext', Array.from(extFilters).sort().join(','));
    }

    return params;
  }

  /**
   * Gọi API backend (ASP.NET) tìm kiếm file theo index SQL Server (FilesController.SearchFiles).
   * Backend đã implement logic bỏ dấu, synonym, match giống Python qua FileSearchKeywordHelper.
   */
  search(
    folderPath: string,
    query: string,
    useAi = false,
    intentHint: 'auto' | 'file_search' | 'reasoning' = 'auto'
  ): Observable<TraCuuFilesApiResponse> {
    let params = new HttpParams()
      .set('folderPath', folderPath)
      .set('q', query);
    if (useAi) {
      params = params
        .set('semantic', 'true')
        .set('intentHint', intentHint);
    }
    const timeoutMs = useAi ? this.aiRequestTimeoutMs : this.requestTimeoutMs;
    return this.http
      .get<TraCuuFilesApiResponse>(`${this.backendApiUrl}/files/search`, { params })
      .pipe(timeout(timeoutMs));
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
      .get<{ ok: boolean; error?: string }>(this.openInExplorerEndpoint, { params })
      .pipe(timeout(this.requestTimeoutMs));
  }

  /** Tải file trực tiếp từ đường dẫn vật lý trên server (AI mode). */
  downloadByPath(fullPath: string): Observable<Blob> {
    const params = new HttpParams().set('path', fullPath);
    return this.http
      .get(`${this.backendApiUrl}/files/download-by-path`, { params, responseType: 'blob' })
      .pipe(timeout(this.requestTimeoutMs));
  }

  /**
   * Kích hoạt chạy indexer ngay lập tức (Python service GET /index/trigger).
   * Index chạy nền, API trả về ngay.
   */
  triggerIndexNow(): Observable<{ ok: boolean; message?: string; error?: string }> {
    return this.http
      .get<{ ok: boolean; message?: string; error?: string }>(`${this.serverBaseUrl}/index/trigger`)
      // Indexer chỉ được trigger nền, nhưng network/host có thể chậm → tăng timeout để tránh lỗi giả.
      .pipe(timeout(60000));
  }

  /**
   * Trạng thái lần chạy indexer gần nhất (GET /index/status).
   * status: idle | running | success | error
   */
  getIndexStatus(): Observable<IndexStatus> {
    return this.http
      .get<IndexStatus>(`${this.serverBaseUrl}/index/status`)
      // Khi indexer đang chạy hoặc server chậm có thể lâu hơn 10s, tăng timeout để tránh spam TimeoutError.
      .pipe(timeout(30000));
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
