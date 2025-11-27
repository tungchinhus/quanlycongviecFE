import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TSMayService, TSMaySearchResponse } from '../../../services/tsmay.service';
import { TSMay } from '../../../models/tsmay.model';
import { TSMayDetailDialogComponent } from '../tsmay-detail-dialog/tsmay-detail-dialog.component';

interface ColumnVisibility {
  [key: string]: boolean;
}

@Component({
  selector: 'app-tsmay-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './tsmay-list.component.html',
  styleUrls: ['./tsmay-list.component.css']
})
export class TSMayListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  readonly data = signal<TSMay[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly total = signal<number>(0);
  selectedPhase: string | null = null; // null = tất cả, '1' = 1 pha, '3' = 3 pha
  readonly columnVisibility = signal<ColumnVisibility>({});
  
  // 6 cột đầu hiển thị mặc định
  readonly defaultVisibleColumns = ['congSuat', 'soMay', 'sbb', 'lsx', 'tChuanLSX', 'tbkt'];
  readonly allColumns = [
    'congSuat', 'soMay', 'sbb', 'lsx', 'tChuanLSX', 'tbkt',
    'po', 'io', 'pk75H1', 'pk75H2', 'uk75H1', 'uk75H2',
    'udmHVH1', 'udmHVH2', 'udmLV'
  ];
  
  readonly displayedColumns = signal<string[]>(this.defaultVisibleColumns);
  
  // Computed để thêm cột actions và settings vào cuối
  readonly displayedColumnsWithActions = computed(() => {
    return [...this.displayedColumns(), 'actions'];
  });
  
  readonly displayedColumnsWithSettings = computed(() => {
    return [...this.displayedColumnsWithActions(), 'columnSettings'];
  });
  dataSource = new MatTableDataSource<TSMay>([]);
  
  readonly pageSize = signal<number>(10);
  readonly pageIndex = signal<number>(0);
  readonly basePageSizeOptions = [10, 25, 50, 100, 200, 500, 1000];
  
  readonly pageSizeOptions = computed(() => {
    const totalCount = this.total();
    const options = [...this.basePageSizeOptions];
    if (totalCount > 1000 && !options.includes(totalCount)) {
      options.push(totalCount);
      options.sort((a, b) => a - b);
    }
    return options;
  });
  
  readonly pageInfo = computed(() => {
    const totalCount = this.total();
    if (totalCount === 0) {
      return '';
    }
    
    const pageSize = this.pageSize();
    const pageIndex = this.pageIndex();
    
    const start = pageIndex * pageSize + 1;
    const end = Math.min(pageIndex * pageSize + pageSize, totalCount);
    return `${start} - ${end}`;
  });

  constructor(
    private tsMayService: TSMayService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    // Khởi tạo column visibility - chỉ 6 cột đầu hiển thị mặc định
    const visibility: ColumnVisibility = {};
    this.allColumns.forEach(col => {
      visibility[col] = this.defaultVisibleColumns.includes(col);
    });
    this.columnVisibility.set(visibility);
  }

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // Không gán paginator vào dataSource khi dùng server-side pagination
    // Chỉ cần đảm bảo paginator được khởi tạo và sync với state
    setTimeout(() => {
      if (this.paginator) {
        this.paginator.length = this.total();
        this.paginator.pageIndex = this.pageIndex();
        this.paginator.pageSize = this.pageSize();
      }
    }, 0);
  }

  loadData() {
    this.isLoading.set(true);
    
    const searchParams = {
      search: this.searchTerm().trim() || undefined,
      phase: this.selectedPhase || undefined,
      page: this.pageIndex(),
      pageSize: this.pageSize()
    };
    
    this.tsMayService.searchWithPagination(searchParams).subscribe({
      next: (response: TSMaySearchResponse | TSMay[]) => {
        // Xử lý cả hai trường hợp: response là object hoặc array
        let data: TSMay[];
        let totalCount: number;
        
        if (Array.isArray(response)) {
          // Fallback: nếu backend trả về array (chưa hỗ trợ pagination)
          data = response;
          totalCount = response.length;
        } else {
          // Response có format { data, total, page, pageSize }
          data = response.data;
          totalCount = response.total;
        }
        
        this.data.set(data);
        this.total.set(totalCount);
        this.dataSource.data = data;
        
        // Cập nhật paginator sau khi load data (server-side pagination)
        setTimeout(() => {
          if (this.paginator) {
            // Sync paginator với state hiện tại
            this.paginator.length = totalCount;
            this.paginator.pageIndex = this.pageIndex();
            this.paginator.pageSize = this.pageSize();
          }
        }, 0);
        
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading TSMay data:', error);
        this.isLoading.set(false);
        this.snackBar.open('Không thể tải dữ liệu. Vui lòng thử lại sau.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
  
  onPhaseChange(phase: string, isChecked: boolean) {
    if (isChecked) {
      // Nếu checkbox được chọn, set phase và bỏ chọn checkbox kia
      this.selectedPhase = phase;
    } else {
      // Nếu checkbox bị bỏ chọn, set về null (hiển thị tất cả)
      this.selectedPhase = null;
    }
    this.pageIndex.set(0);
    this.loadData();
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
    // Debounce search để tránh gọi API quá nhiều
    this.debounceSearch();
  }

  private searchTimeout: any;
  private debounceSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadData();
    }, 500); // Đợi 500ms sau khi user ngừng gõ
  }

  onPageChange(event: PageEvent) {
    // Chỉ xử lý nếu không đang loading
    if (this.isLoading()) {
      return;
    }
    
    // Cập nhật state trước
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    
    // Gọi API để load data mới
    this.loadData();
  }

  showAllItems() {
    // Không cần thiết nữa vì pagination được xử lý ở backend
    // Có thể để trống hoặc xóa method này
  }

  formatCellValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  getColumnLabel(column: string): string {
    const labels: { [key: string]: string } = {
      'congSuat': 'Công suất',
      'soMay': 'Số máy',
      'sbb': 'SBB',
      'lsx': 'LSX',
      'tChuanLSX': 'T.Chuẩn LSX',
      'tbkt': 'TBKT',
      'po': 'Po',
      'io': 'Io',
      'pk75H1': 'Pk75(H1)',
      'pk75H2': 'Pk75(H2)',
      'uk75H1': 'Uk75(H1)',
      'uk75H2': 'Uk75(H2)',
      'udmHVH1': 'Uđm HV(H1)',
      'udmHVH2': 'Uđm HV(H2)',
      'udmLV': 'Uđm LV'
    };
    return labels[column] || column;
  }

  toggleColumnVisibility(column: string) {
    const visibility = { ...this.columnVisibility() };
    visibility[column] = !visibility[column];
    this.columnVisibility.set(visibility);
    
    // Cập nhật displayedColumns
    const visibleColumns = this.allColumns.filter(col => visibility[col]);
    this.displayedColumns.set(visibleColumns);
  }

  showAllColumns() {
    const visibility: ColumnVisibility = {};
    this.allColumns.forEach(col => {
      visibility[col] = true;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([...this.allColumns]);
  }

  hideAllColumns() {
    const visibility: ColumnVisibility = {};
    this.allColumns.forEach(col => {
      visibility[col] = false;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([]);
  }

  viewTSMay(item: TSMay) {
    // Hiển thị thông tin chi tiết trong dialog
    this.dialog.open(TSMayDetailDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      minWidth: '320px',
      data: {
        tsMay: item,
        mode: 'view'
      },
      disableClose: false
    });
  }

  editTSMay(item: TSMay) {
    // Mở dialog chỉnh sửa
    const dialogRef = this.dialog.open(TSMayDetailDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      minWidth: '320px',
      data: {
        tsMay: item,
        mode: 'edit'
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Reload data sau khi chỉnh sửa
        this.loadData();
      }
    });
  }

  deleteTSMay(item: TSMay) {
    if (!item.id) {
      this.snackBar.open('Không thể xóa: Thiếu ID của bản ghi.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const confirmMessage = `Bạn có chắc muốn xóa thông số máy "${item.soMay || item.id}"?`;
    if (confirm(confirmMessage)) {
      this.isLoading.set(true);
      this.tsMayService.delete(item.id).subscribe({
        next: () => {
          this.snackBar.open('Xóa thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
          this.loadData();
        },
        error: (error) => {
          console.error('Error deleting TSMay:', error);
          this.isLoading.set(false);
          this.snackBar.open('Không thể xóa bản ghi. Vui lòng thử lại sau.', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  ngOnDestroy() {
    // Cleanup: clear search timeout nếu component bị destroy
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}

