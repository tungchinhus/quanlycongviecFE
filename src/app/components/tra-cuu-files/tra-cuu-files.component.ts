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
  readonly pickingFolder = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly searchResults = signal<TraCuuFilesSearchResult[]>([]);
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

  /** Thông báo lỗi dễ hiểu khi gọi Python service thất bại. */
  private getErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'TimeoutError') {
      return 'Hết thời gian chờ (90s). Kiểm tra Python service đã chạy từ C:\\python-service chưa (port 8000).';
    }
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Không kết nối được Python service. Kiểm tra: 1) Đã chạy từ C:\\python-service chưa (port 8000)? 2) CORS đã bật?';
      }
      if (err.status === 404) {
        return 'Python service không có endpoint /search. Kiểm tra lại API.';
      }
      const msg = err.error?.error ?? err.error?.message ?? err.message;
      if (msg) return String(msg);
    }
    const msg = (err as { message?: string })?.message ?? (err as { error?: { message?: string } })?.error?.message;
    return msg ? String(msg) : 'Không gọi được API Python service.';
  }

  /**
   * Mở Explorer và focus đúng file (gọi Python service trên máy user).
   * Ưu tiên dùng row.fullPath (backend trả về) nếu có, nếu không thì combine base + row.path.
   */
  openInExplorer(row: TraCuuFilesSearchResult): void {
    let fullPath: string;
    if (row.fullPath && typeof row.fullPath === 'string') {
      // Backend đã trả về đường dẫn đầy đủ (có thể UNC nếu đã resolve)
      fullPath = row.fullPath.trim();
    } else {
      // Fallback: combine từ folderPath input + row.path
      const base = this.folderPath().trim().replace(/[\\/]+$/, '');
      const rel = (row.path ?? row.name ?? '').trim();
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
        this.error.set('Không mở được Explorer. Kiểm tra Python service từ C:\\python-service đang chạy (port 8000).');
      },
    });
  }

  /** Dựa vào path đã chọn + từ khóa, gọi API Python để tìm thông tin. */
  doSearch(): void {
    const path = this.folderPath().trim();
    const query = this.searchTerm().trim();
    if (!path) {
      this.error.set('Vui lòng chọn hoặc nhập đường dẫn folder.');
      return;
    }
    if (!query) {
      this.error.set('Vui lòng nhập từ khóa tìm kiếm.');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.traCuuFilesService.search(path, query, this.useAi()).subscribe({
      next: (res: TraCuuFilesApiResponse) => {
        this.loading.set(false);
        const errMsg = res['error'] as string | undefined;
        if (errMsg) {
          this.error.set(errMsg);
          this.searchResults.set([]);
          return;
        }
        const list = res.results ?? (res.files ? res.files.map(f => ({ path: f, name: f })) : []);
        this.searchResults.set(list);
        this.pageIndex.set(0); // Reset về trang đầu khi có kết quả mới
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.searchResults.set([]);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
