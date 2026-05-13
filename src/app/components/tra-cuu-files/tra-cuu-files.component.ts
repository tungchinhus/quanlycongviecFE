import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TraCuuFilesService, TraCuuFilesApiResponse, TraCuuFilesSearchResult } from '../../services/tra-cuu-files.service';
import { SettingsService } from '../../services/settings.service';
import { HttpErrorResponse } from '@angular/common/http';
import { computed } from '@angular/core';

@Component({
  selector: 'app-tra-cuu-files',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatCheckboxModule
  ],
  templateUrl: './tra-cuu-files.component.html',
  styleUrls: ['./tra-cuu-files.component.css']
})
export class TraCuuFilesComponent implements OnInit {
  readonly folderPath = signal<string>('');
  readonly searchTerm = signal<string>('');
  readonly useAi = signal<boolean>(false);
  readonly loading = signal<boolean>(false);
  readonly loadingMessage = signal<string>('Đang tìm kiếm (backend)…');
  readonly pickingFolder = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly searchResults = signal<TraCuuFilesSearchResult[]>([]);
  readonly currentIntent = signal<'file_search' | 'reasoning' | null>(null);
  readonly aiAnswer = signal<string | null>(null);
  readonly aiSource = signal<TraCuuFilesSearchResult | null>(null);
  readonly pageSize = signal<number>(25);
  readonly pageIndex = signal<number>(0);

  readonly paginatedResults = computed(() => {
    const results = this.searchResults();
    const size = this.pageSize();
    const index = this.pageIndex();
    const start = index * size;
    return results.slice(start, start + size);
  });

  /**
   * Thứ tự cột hiển thị trên bảng:
   * - name:      TBKT file
   * - path:      TBKT url
   * - bomName:   Tên file BOM
   * - bomPath:   Đường dẫn BOM
   */
  displayedColumns: string[] = ['name', 'path', 'bomName', 'bomPath'];

  constructor(
    private traCuuFilesService: TraCuuFilesService,
    private settingsService: SettingsService
  ) {}

  private debugLog(
    hypothesisId: string,
    location: string,
    message: string,
    data: Record<string, unknown>,
    runId = 'debug'
  ): void {
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/f756d36b-7fc7-4eca-a996-a24d8a1a5faf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'da37a0'},body:JSON.stringify({sessionId:'da37a0',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  ngOnInit(): void {
    this.settingsService.getIndexRoots().subscribe({
      next: (res) => {
        const path = res?.indexRoots?.trim();
        if (path) this.folderPath.set(path);
      }
    });
  }

  onFolderPathChange(value: string): void {
    this.folderPath.set(value ?? '');
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value ?? '');
  }

  /**
   * Xây dựng đường dẫn đầy đủ từ handle (nếu trình duyệt hỗ trợ getParent), nếu không thì trả về tên folder.
   */
  private async getFullPathFromHandle(handle: FileSystemDirectoryHandle): Promise<string> {
    const segments: string[] = [];
    let current: FileSystemDirectoryHandle | null = handle;
    while (current) {
      segments.unshift(current.name);
      const withParent = current as FileSystemDirectoryHandle & { getParent?: () => Promise<FileSystemDirectoryHandle | null> };
      if (typeof withParent.getParent !== 'function') break;
      const parent = await withParent.getParent!().catch(() => null);
      if (!parent || parent === current) break;
      current = parent;
    }
    return segments.filter(Boolean).join('\\') || handle.name;
  }

  /**
   * Mở hộp thoại chọn folder của trình duyệt (showDirectoryPicker) — như ban đầu.
   * Điền tên folder hoặc đường dẫn (nếu trình duyệt hỗ trợ getParent). Có thể nhập/dán đường dẫn đầy đủ (vd. M:\...) vào ô.
   */
  triggerFolderPick(): void {
    this.error.set(null);
    this.pickingFolder.set(true);
    this.openBrowserFolderPick();
  }

  /**
   * Hộp thoại chọn thư mục của trình duyệt (showDirectoryPicker).
   */
  private async openBrowserFolderPick(): Promise<void> {
    const w = window as Window & { showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle> };
    if (typeof w.showDirectoryPicker !== 'function') {
      this.pickingFolder.set(false);
      this.error.set('Trình duyệt không hỗ trợ chọn folder. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }
    try {
      const handle = await w.showDirectoryPicker({ mode: 'read' });
      const fullPath = await this.getFullPathFromHandle(handle);
      this.folderPath.set(fullPath);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User hủy — không báo lỗi
      } else {
        this.error.set(err instanceof Error ? err.message : 'Không chọn được folder.');
      }
    } finally {
      this.pickingFolder.set(false);
    }
  }

  onSearchKeydown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    this.doSearch();
  }

  private normalizeIntentText(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private inferIntentHint(query: string): 'auto' | 'file_search' | 'reasoning' {
    const normalized = this.normalizeIntentText(query);
    if (!normalized) return 'auto';
    const hasFileCode =
      /[a-z]{1,4}\s*\d{2,6}[a-z0-9-]*/i.test(normalized) ||
      normalized.includes('tbkt') ||
      normalized.includes('tskt') ||
      normalized.includes('gdn');
    const asksForContent =
      normalized.includes('thong so') ||
      normalized.includes('la gi') ||
      normalized.includes('noi dung') ||
      normalized.includes('chi tiet');
    // Truy vấn có mã file + câu hỏi nội dung: ưu tiên reasoning theo ngữ cảnh file.
    if (hasFileCode && asksForContent) {
      return 'reasoning';
    }
    const fileSignals = [
      'tbkt',
      'tskt',
      'gdn',
      'pdf',
      'duong dan',
      'mo file',
      'tim file',
      'tai lieu'
    ];
    if (
      fileSignals.some((k) => normalized.includes(k)) ||
      hasFileCode ||
      /\.(pdf|docx?|xlsx?|pptx?|dwg)\b/i.test(normalized)
    ) {
      return 'file_search';
    }
    const reasoningSignals = [
      'tinh toan',
      'so sanh',
      'phan tich',
      'vi sao',
      'de xuat',
      'tong hop',
      'uoc luong',
      'du doan'
    ];
    if (
      reasoningSignals.some((k) => normalized.includes(k)) ||
      /\d+\s*[\+\-\*\/]\s*\d+/i.test(normalized)
    ) {
      return 'reasoning';
    }
    return 'auto';
  }

  /** Thông báo lỗi dễ hiểu khi gọi Python service thất bại. */
  private getErrorMessage(err: unknown, useAi = false): string {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'TimeoutError') {
      if (useAi) {
        return 'Hết thời gian chờ ở Chế độ AI. Kiểm tra API backend, Ollama (11434), Qdrant (6333). Lần gọi đầu có thể chậm do model embedding vừa khởi động.';
      }
      return 'Hết thời gian chờ khi gọi API backend. Vui lòng kiểm tra server backend có đang chạy không.';
    }
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Không kết nối được API backend. Kiểm tra kết nối mạng hoặc server backend.';
      }
      if (err.status === 404) {
        return 'API backend không có endpoint tìm kiếm (GET /api/files/search). Kiểm tra lại cấu hình backend.';
      }
      const msg = err.error?.error ?? err.error?.message ?? err.message;
      if (msg) return String(msg);
    }
    const msg = (err as { message?: string })?.message ?? (err as { error?: { message?: string } })?.error?.message;
    return msg ? String(msg) : 'Không gọi được API Python service.';
  }

  /**
   * Mở Explorer và focus đúng file (gọi Python service trên máy user).
   * Ưu tiên: row.fullPath → nếu row.path đã là đường dẫn tuyệt đối (UNC hoặc X:\...) thì dùng luôn → còn không thì base + row.path.
   */
  openInExplorer(row: TraCuuFilesSearchResult): void {
    let fullPath: string;
    const pathStr = (row.path ?? '').trim();
    const fullPathFromApi = row.fullPath && typeof row.fullPath === 'string' ? row.fullPath.trim() : '';
    if (fullPathFromApi) {
      fullPath = fullPathFromApi;
    } else if (pathStr && this.isAbsolutePath(pathStr)) {
      // Cột "TBKT url" có thể đã hiển thị đường dẫn đầy đủ (backend trả path = FullPath)
      fullPath = pathStr;
    } else {
      const base = this.folderPath().trim().replace(/[\\/]+$/, '');
      const rel = pathStr || (row.name ?? '').trim();
      if (!base || !rel) return;
      fullPath = `${base}\\${rel}`.replace(/\\+/g, '\\');
    }
    if (!fullPath) return;
    this.traCuuFilesService.openInExplorer(fullPath).subscribe({
      next: (res) => {
        if (res && !res.ok && res.error) {
          this.error.set(res.error);
        }
      },
      error: () => {
        this.error.set('Không mở được Explorer. Nếu dùng backend: kiểm tra API server. Nếu dùng Python: chạy service từ C:\\python-service (port mặc định 8001).');
      },
    });
  }

  /** Kiểm tra path đã là đường dẫn tuyệt đối (UNC \\server\... hoặc ổ đĩa X:\...). */
  private isAbsolutePath(path: string): boolean {
    if (!path || path.length < 2) return false;
    if (path.startsWith('\\\\') || path.startsWith('//')) return true;
    const drive = path.slice(0, 2).toUpperCase();
    return /^[A-Z]:$/.test(drive) && (path.length === 2 || path[2] === '\\' || path[2] === '/');
  }

  /** Chuẩn hóa path Windows (backslash, bỏ \\ cuối). */
  private normalizePathForCompare(path: string): string {
    return path.replace(/\//g, '\\').replace(/[\\]+$/, '').toLowerCase();
  }

  /** Sinh đường dẫn tương đối từ folder gốc + fullPath (giống Python). */
  private buildRelativePath(baseFolder: string, fullPath: string | undefined, fallbackName: string | undefined): string | undefined {
    if (!fullPath || !baseFolder) return fallbackName;
    const baseNormRaw = baseFolder.trim();
    if (!baseNormRaw) return fallbackName;
    const baseNorm = baseNormRaw.replace(/\//g, '\\').replace(/[\\]+$/, '');
    const fullNorm = fullPath.replace(/\//g, '\\');
    const baseLower = baseNorm.toLowerCase();
    const fullLower = fullNorm.toLowerCase();
    if (fullLower === baseLower) {
      return '';
    }
    if (fullLower.startsWith(baseLower + '\\')) {
      return fullNorm.substring(baseNorm.length).replace(/^\\+/, '');
    }
    return fallbackName;
  }

  /** Dựa vào path đã chọn + từ khóa, gọi API Python để tìm thông tin. */
  doSearch(): void {
    const path = this.folderPath().trim();
    const query = this.searchTerm().trim();
    const intentHint = this.useAi() ? this.inferIntentHint(query) : 'file_search';
    const needsFolder = !this.useAi() || intentHint !== 'reasoning';
    if (!path && needsFolder) {
      this.error.set('Vui lòng chọn hoặc nhập đường dẫn folder.');
      return;
    }
    if (!query) {
      this.error.set('Vui lòng nhập từ khóa tìm kiếm.');
      return;
    }
    this.error.set(null);
    this.currentIntent.set(null);
    this.aiAnswer.set(null);
    this.aiSource.set(null);
    if (!this.useAi()) {
      this.loadingMessage.set('Đang tìm kiếm file trong index…');
    } else if (intentHint === 'reasoning') {
      this.loadingMessage.set('Đang phân tích ngữ cảnh bằng OpenClaw AI…');
    } else {
      this.loadingMessage.set('Đang truy vấn AI search (OpenClaw + Qdrant)…');
    }
    this.loading.set(true);
    // #region agent log
    this.debugLog('H1', 'tra-cuu-files.component.ts:doSearch:before-api', 'Search triggered', {
      useAi: this.useAi(),
      query,
      folderPath: path,
      intentHint
    }, 'run-before-fix');
    // #endregion
    this.traCuuFilesService.search(path, query, this.useAi(), intentHint).subscribe({
      next: (res: TraCuuFilesApiResponse) => {
        this.loading.set(false);
        this.loadingMessage.set('Đang tìm kiếm (backend)…');
        this.currentIntent.set((res.intent as 'file_search' | 'reasoning' | undefined) ?? 'file_search');
        this.aiAnswer.set((res.aiAnswer as string | undefined) ?? null);
        if (Array.isArray(res.results) && res.results.length > 0) {
          this.aiSource.set(res.results[0]);
        } else {
          this.aiSource.set(null);
        }
        // #region agent log
        this.debugLog('H2', 'tra-cuu-files.component.ts:doSearch:api-response', 'Raw API response summary', {
          useAi: this.useAi(),
          usedSemantic: (res['usedSemantic'] as boolean | undefined) ?? null,
          usedIndex: (res['usedIndex'] as boolean | undefined) ?? null,
          candidatesCount: (res['candidatesCount'] as number | undefined) ?? null,
          intent: res.intent ?? 'file_search',
          aiAnswerPreview: typeof res.aiAnswer === 'string' ? res.aiAnswer.slice(0, 220) : null,
          aiAnswerLength: typeof res.aiAnswer === 'string' ? res.aiAnswer.length : 0,
          resultCount: Array.isArray(res.results) ? res.results.length : 0,
          top3: Array.isArray(res.results)
            ? res.results.slice(0, 3).map((x) => ({
                name: x.name ?? null,
                path: x.path ?? null,
                fullPath: x.fullPath ?? null,
                score: (x['score'] as number | undefined) ?? null,
                snippetPrefix: typeof x['snippet'] === 'string' ? (x['snippet'] as string).slice(0, 120) : null
              }))
            : []
        }, 'run-before-fix');
        // #endregion
        const errMsg = res['error'] as string | undefined;
        if (errMsg) {
          this.error.set(errMsg);
          this.searchResults.set([]);
          // #region agent log
          this.debugLog('H3', 'tra-cuu-files.component.ts:doSearch:error-msg', 'API returned error field', {
            errMsg,
            intent: this.currentIntent()
          }, 'run-before-fix');
          // #endregion
          return;
        }
        if (this.currentIntent() === 'reasoning') {
          this.searchResults.set([]);
          this.pageIndex.set(0);
          // #region agent log
          this.debugLog('H4', 'tra-cuu-files.component.ts:doSearch:reasoning-branch', 'Reasoning branch rendered', {
            aiAnswerPreview: (this.aiAnswer() ?? '').slice(0, 220),
            aiSourceName: this.aiSource()?.name ?? null,
            aiSourcePath: this.aiSource()?.fullPath ?? this.aiSource()?.path ?? null
          }, 'run-before-fix');
          // #endregion
          return;
        }
        const baseFolder = path;
        let list: TraCuuFilesSearchResult[] = [];
        if (Array.isArray(res.results) && res.results.length > 0) {
          list = res.results.map((item) => {
            const name = (item.name ?? (item as any).Name) as string | undefined;
            const fullPath = (item.fullPath ?? (item as any).fullPath ?? (item as any).FullPath) as string | undefined;
            const existingPath = (item.path ?? (item as any).path) as string | undefined;
            const relPath = existingPath ?? this.buildRelativePath(baseFolder, fullPath, name);
            return {
              ...item,
              name,
              fullPath,
              path: relPath
            };
          });
        } else if (res.files) {
          list = res.files.map(f => ({ path: f, name: f }));
        }
        this.searchResults.set(list);
        this.pageIndex.set(0); // Reset về trang đầu khi có kết quả mới
        // #region agent log
        this.debugLog('H5', 'tra-cuu-files.component.ts:doSearch:file-search-branch', 'File-search branch rendered', {
          listCount: list.length,
          firstName: list[0]?.name ?? null,
          firstPath: list[0]?.path ?? null
        }, 'run-before-fix');
        // #endregion
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.loadingMessage.set('Đang tìm kiếm (backend)…');
        this.searchResults.set([]);
        this.aiSource.set(null);
        this.error.set(this.getErrorMessage(err, this.useAi()));
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
