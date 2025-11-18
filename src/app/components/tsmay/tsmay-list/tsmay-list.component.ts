import { Component, OnInit, AfterViewInit, ViewChild, signal, computed, effect } from '@angular/core';
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
import { TSMayService } from '../../../services/tsmay.service';
import { TSMay } from '../../../models/tsmay.model';

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
    MatTooltipModule
  ],
  templateUrl: './tsmay-list.component.html',
  styleUrls: ['./tsmay-list.component.css']
})
export class TSMayListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  readonly data = signal<TSMay[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  
  // 6 cột đầu hiển thị mặc định
  readonly defaultVisibleColumns = ['congSuat', 'soMay', 'sbb', 'lsx', 'tChuanLSX', 'tbkt'];
  readonly allColumns = [
    'congSuat', 'soMay', 'sbb', 'lsx', 'tChuanLSX', 'tbkt',
    'po', 'io', 'pk75H1', 'pk75H2', 'uk75H1', 'uk75H2',
    'udmHVH1', 'udmHVH2', 'udmLV'
  ];
  
  readonly displayedColumns = signal<string[]>(this.defaultVisibleColumns);
  dataSource = new MatTableDataSource<TSMay>([]);
  
  readonly pageSize = signal<number>(10);
  readonly pageIndex = signal<number>(0);
  readonly basePageSizeOptions = [10, 25, 50, 100, 200, 500, 1000];
  
  readonly pageSizeOptions = computed(() => {
    const total = this.filteredData().length;
    const options = [...this.basePageSizeOptions];
    if (total > 1000 && !options.includes(total)) {
      options.push(total);
      options.sort((a, b) => a - b);
    }
    return options;
  });
  
  readonly filteredData = computed(() => {
    const data = this.data();
    const search = this.searchTerm().toLowerCase().trim();
    
    if (!search) {
      return data;
    }
    
    return data.filter(item => {
      return (
        (item.soMay && item.soMay.toLowerCase().includes(search)) ||
        (item.sbb && item.sbb.toLowerCase().includes(search)) ||
        (item.lsx && item.lsx.toLowerCase().includes(search)) ||
        (item.tChuanLSX && item.tChuanLSX.toLowerCase().includes(search)) ||
        (item.tbkt && item.tbkt.toLowerCase().includes(search)) ||
        (item.congSuat && item.congSuat.toString().includes(search))
      );
    });
  });
  
  readonly actualPageSize = computed(() => {
    const size = this.pageSize();
    const total = this.filteredData().length;
    return size >= total ? total : size;
  });
  
  readonly pageInfo = computed(() => {
    const filteredLength = this.filteredData().length;
    if (filteredLength === 0) {
      return '';
    }
    
    const pageSize = this.actualPageSize();
    const pageIndex = this.pageIndex();
    
    if (pageSize >= filteredLength) {
      return `1 - ${filteredLength}`;
    }
    
    const start = pageIndex * pageSize + 1;
    const end = Math.min(pageIndex * pageSize + pageSize, filteredLength);
    return `${start} - ${end}`;
  });

  constructor(
    private tsMayService: TSMayService,
    private snackBar: MatSnackBar
  ) {
    // Tự động cập nhật dataSource khi filteredData thay đổi
    effect(() => {
      const filtered = this.filteredData();
      this.dataSource.data = filtered;
      
      setTimeout(() => {
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
      }, 0);
    });
  }

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }, 0);
  }

  loadData() {
    this.isLoading.set(true);
    this.tsMayService.getAll().subscribe({
      next: (items) => {
        this.data.set(items);
        this.isLoading.set(false);
        // dataSource sẽ tự động cập nhật qua effect
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

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
    this.updateDataSource();
  }

  updateDataSource() {
    const filtered = this.filteredData();
    this.dataSource.data = filtered;
    
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
  }

  showAllItems() {
    const total = this.filteredData().length;
    this.pageSize.set(total);
    this.pageIndex.set(0);
    this.updateDataSource();
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
}

