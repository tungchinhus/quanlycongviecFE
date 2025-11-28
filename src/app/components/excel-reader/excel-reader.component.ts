import { Component, OnInit, signal, computed, ViewChild, AfterViewInit, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import * as XLSX from 'xlsx';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';
import { ColumnSelectionDialogComponent, ColumnSelectionData } from './column-selection-dialog.component';

interface ExcelData {
  [key: string]: any;
}

interface ColumnVisibility {
  [key: string]: boolean;
}

@Component({
  selector: 'app-excel-reader',
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
    MatCheckboxModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './excel-reader.component.html',
  styleUrls: ['./excel-reader.component.css']
})
export class ExcelReaderComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  readonly excelData = signal<ExcelData[]>([]);
  readonly searchTerm = signal<string>('');
  readonly columnVisibility = signal<ColumnVisibility>({});
  readonly isLoading = signal<boolean>(false);
  
  // Các cột cố định
  readonly fixedColumns = ['CongSuat', 'SoMay', 'SBB', 'LSX', 'TChuanLSX', 'TBKT', 'Po', 'Io', 'Pk75H1', 'Pk75H2', 'Uk75H1', 'Uk75H2', 'UdmHVH1', 'UdmHVH2', 'UdmLV'];
  readonly columnLabels: { [key: string]: string } = {
    'CongSuat': 'Công suất',
    'SoMay': 'Số máy',
    'SBB': 'SBB',
    'LSX': 'LSX',
    'TChuanLSX': 'T.Chuẩn LSX',
    'TBKT': 'TBKT',
    'Po': 'Po',
    'Io': 'Io',
    'Pk75H1': 'Pk75(H1)',
    'Pk75H2': 'Pk75(H2)',
    'Uk75H1': 'Uk75(H1)',
    'Uk75H2': 'Uk75(H2)',
    'UdmHVH1': 'Uđm HV(H1)',
    'UdmHVH2': 'Uđm HV(H2)',
    'UdmLV': 'Uđm LV'
  };
  
  // 6 cột đầu hiển thị mặc định
  readonly defaultVisibleColumns = ['CongSuat', 'SoMay', 'SBB', 'LSX', 'TChuanLSX', 'TBKT'];
  
  readonly displayedColumns = signal<string[]>(this.defaultVisibleColumns);
  readonly allColumns = signal<string[]>(this.fixedColumns);
  readonly dynamicColumns = signal<string[]>([]); // Các cột động từ file Excel
  
  // Computed để thêm cột actions và settings vào cuối (actions trước settings)
  readonly displayedColumnsWithSettings = computed(() => {
    return [...this.displayedColumns(), 'actions', 'columnSettings'];
  });

  // Selected row for actions
  selectedRow: ExcelData | null = null;
  selectedRowIndex: number = -1;
  
  dataSource = new MatTableDataSource<ExcelData>([]);
  readonly pageSize = signal<number>(10);
  readonly pageIndex = signal<number>(0);
  readonly basePageSizeOptions = [10, 25, 50, 100, 200, 500, 1000];
  
  // Computed pageSizeOptions: thêm tổng số dòng nếu lớn hơn 1000
  readonly pageSizeOptions = computed(() => {
    const total = this.filteredData().length;
    const options = [...this.basePageSizeOptions];
    // Nếu tổng số dòng > 1000 và chưa có trong options, thêm vào
    if (total > 1000 && !options.includes(total)) {
      options.push(total);
      options.sort((a, b) => a - b);
    }
    return options;
  });
  
  readonly filteredData = computed(() => {
    const data = this.excelData();
    const search = this.searchTerm().toLowerCase().trim();
    const visibleColumns = this.displayedColumns();
    
    if (!search) {
      return data;
    }
    
    // Tìm kiếm chỉ trong các cột đang hiển thị
    return data.filter(row => {
      return visibleColumns.some(col => {
        const value = row[col];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(search);
      });
    });
  });
  
  readonly isManager = computed(() => {
    // Cho phép tất cả user đã login truy cập
    return this.authService.isAuthenticated();
  });

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    // Khởi tạo column visibility - chỉ 6 cột đầu hiển thị mặc định
    const visibility: ColumnVisibility = {};
    this.fixedColumns.forEach(col => {
      // Chỉ 6 cột đầu hiển thị mặc định
      visibility[col] = this.defaultVisibleColumns.includes(col);
    });
    this.columnVisibility.set(visibility);
    
    // Tự động cập nhật dataSource khi filteredData thay đổi
    effect(() => {
      const filtered = this.filteredData();
      this.dataSource.data = filtered;
      
      // Đảm bảo paginator được gán lại sau khi data thay đổi
      setTimeout(() => {
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
      }, 0);
    });
  }

  ngOnInit() {
    // Component initialization - table đã có cột nhưng chưa có data
  }

  ngAfterViewInit() {
    // Đảm bảo paginator được gán sau khi view init
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }, 0);
  }

  onPageChange(event: PageEvent) {
    const newPageSize = event.pageSize;
    const newPageIndex = event.pageIndex;
    const oldPageSize = this.pageSize();
    
    this.pageSize.set(newPageSize);
    this.pageIndex.set(newPageIndex);
    
    if (newPageSize !== oldPageSize) {
      // Reload data khi thay đổi pageSize
      this.reloadData();
    }
  }

  // Tính toán pageSize thực tế để hiển thị (nếu pageSize >= tổng số dòng thì hiển thị tất cả)
  readonly actualPageSize = computed(() => {
    const size = this.pageSize();
    const total = this.filteredData().length;
    // Nếu pageSize >= tổng số dòng, hiển thị tất cả
    return size >= total ? total : size;
  });
  
  // Method để set hiển thị tất cả
  showAllItems() {
    const total = this.filteredData().length;
    this.pageSize.set(total);
    this.pageIndex.set(0);
    this.reloadData();
  }

  reloadData() {
    // Cập nhật lại dataSource với pageSize mới
    const filtered = this.filteredData();
    this.dataSource.data = filtered;
    
    // Reset về trang đầu
    this.pageIndex.set(0);
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    
    // Kiểm tra định dạng file
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      this.snackBar.open('Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading.set(true);
    
    const reader = new FileReader();
    const isCSV = fileExtension === '.csv';
    
    reader.onload = (e: any) => {
      try {
        let workbook: XLSX.WorkBook;
        
        if (isCSV) {
          // Xử lý CSV riêng
          const text = e.target.result as string;
          workbook = XLSX.read(text, { 
            type: 'string',
            sheetStubs: false
          });
        } else {
          // Xử lý Excel files
          const data = new Uint8Array(e.target.result);
          workbook = XLSX.read(data, { 
            type: 'array',
            sheetStubs: false
          });
        }
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('File không có sheet nào');
        }
        
        // Lấy sheet đầu tiên
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        if (!worksheet) {
          throw new Error('Không thể đọc dữ liệu từ sheet');
        }
        
        // Đọc dữ liệu dạng array of arrays để lấy tất cả các cột
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          defval: '',
          blankrows: false,
          header: 1 // Đọc dạng array of arrays
        }) as any[][];
        
        if (!rawData || rawData.length === 0) {
          throw new Error('File Excel không có dữ liệu');
        }
        
        // Tên cột nằm ở hàng 2 và 3 (index 1 và 2)
        // Ưu tiên lấy từ hàng 2, nếu rỗng thì lấy từ hàng 3
        const row2 = rawData.length > 1 ? rawData[1] : null; // Hàng 2 (index 1)
        const row3 = rawData.length > 2 ? rawData[2] : null; // Hàng 3 (index 2)
        
        // Xác định header row index (ưu tiên hàng 2, nếu không có thì dùng hàng 3)
        let headerRowIndex = 1; // Mặc định là hàng 2
        if (!row2 || !Array.isArray(row2) || !row2.some(cell => cell !== '' && cell !== null && cell !== undefined)) {
          // Nếu hàng 2 rỗng, dùng hàng 3
          if (row3 && Array.isArray(row3) && row3.some(cell => cell !== '' && cell !== null && cell !== undefined)) {
            headerRowIndex = 2;
          } else {
            throw new Error('Không tìm thấy tên cột ở hàng 2 hoặc 3');
          }
        }
        
        const headerRow = rawData[headerRowIndex];
        if (!headerRow || !Array.isArray(headerRow)) {
          throw new Error('Không tìm thấy dòng header');
        }
        
        // Lấy tất cả các cột từ hàng header
        // Kết hợp header chính (hàng 3) với sub-header (hàng 2)
        const allColumns: string[] = [];
        const row2Data = row2 && Array.isArray(row2) ? row2 : [];
        const row3Data = row3 && Array.isArray(row3) ? row3 : [];
        
        // Tìm số cột tối đa
        const maxCols = Math.max(
          headerRow.length,
          row2Data.length,
          row3Data.length
        );
        
        // Map để lưu header chính cho mỗi cột (xử lý merged cells) - lấy từ hàng 3
        const mainHeaderMap: string[] = [];
        let currentMainHeader = '';
        
        // Đầu tiên, xây dựng map header chính từ hàng 3
        for (let index = 0; index < maxCols; index++) {
          const row3Cell = index < row3Data.length ? row3Data[index] : null;
          if (row3Cell !== null && row3Cell !== undefined && row3Cell !== '') {
            currentMainHeader = String(row3Cell).trim();
          }
          // Nếu cell rỗng, giữ nguyên header trước đó (merged cells)
          mainHeaderMap[index] = currentMainHeader;
        }
        
        for (let index = 0; index < maxCols; index++) {
          // Lấy sub-header từ hàng 2
          let subHeader = '';
          const subHeaderCell = index < row2Data.length ? row2Data[index] : null;
          
          if (subHeaderCell !== null && subHeaderCell !== undefined && subHeaderCell !== '') {
            subHeader = String(subHeaderCell).trim();
          }
          
          // Lấy header chính từ map (hàng 3)
          const mainHeader = mainHeaderMap[index] || '';
          
          // Tạo tên cột: kết hợp header chính với sub-header (format: mainHeader_subHeader)
          let columnName = '';
          
          if (mainHeader) {
            // Nếu có header chính, luôn ưu tiên kết hợp với sub-header
            if (subHeader) {
              // Làm sạch header chính: loại bỏ khoảng trắng thừa, giữ lại dấu ngoặc và ký tự đặc biệt
              const cleanMainHeader = mainHeader.trim().replace(/\s+/g, '');
              columnName = `${subHeader}_${cleanMainHeader}`;
            } else {
              // Nếu không có sub-header nhưng có header chính, dùng header chính
              columnName = mainHeader.trim();
            }
          } else if (subHeader) {
            // Nếu không có header chính nhưng có sub-header, chỉ dùng sub-header
            columnName = subHeader;
          } else {
            // Nếu không có cả hai, dùng tên mặc định
            columnName = `Cột ${String.fromCharCode(65 + index)}`; // A, B, C, ...
          }
          
          allColumns.push(columnName);
        }
        
        if (allColumns.length === 0) {
          throw new Error('Không tìm thấy cột nào trong file');
        }
        
        // Lưu danh sách cột
        this.dynamicColumns.set(allColumns);
        
        // Đóng loading và mở dialog chọn cột
        this.isLoading.set(false);
        
        // Mở dialog để chọn cột
        const dialogRef = this.dialog.open(ColumnSelectionDialogComponent, {
          width: '600px',
          maxWidth: '90vw',
          data: {
            columns: allColumns,
            selectedColumns: allColumns // Mặc định chọn tất cả
          } as ColumnSelectionData
        });
        
        dialogRef.afterClosed().subscribe((selectedColumns: string[] | undefined) => {
          if (!selectedColumns || selectedColumns.length === 0) {
            // Người dùng hủy hoặc không chọn cột nào
            input.value = '';
            return;
          }
          
          // Đọc dữ liệu chỉ từ các cột được chọn
          this.readDataWithSelectedColumns(rawData, headerRowIndex, allColumns, selectedColumns, file.name);
          input.value = '';
        });
        
      } catch (error) {
        console.error('Error reading Excel file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        this.snackBar.open(`Lỗi khi đọc file: ${errorMessage}`, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isLoading.set(false);
        input.value = '';
      }
    };
    
    reader.onerror = () => {
      this.isLoading.set(false);
      this.snackBar.open('Lỗi khi đọc file', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      input.value = '';
    };
    
    // Đọc file theo định dạng
    if (isCSV) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  /**
   * Đọc dữ liệu từ Excel với các cột được chọn
   */
  private readDataWithSelectedColumns(
    rawData: any[][],
    headerRowIndex: number,
    allColumns: string[],
    selectedColumns: string[],
    fileName: string
  ) {
    try {
      this.isLoading.set(true);
      
      // Tạo mapping từ tên cột sang index
      const columnIndexMap: { [key: string]: number } = {};
      allColumns.forEach((colName, index) => {
        columnIndexMap[colName] = index;
      });
      
      // Lấy các index của các cột được chọn
      const selectedColumnIndices = selectedColumns
        .map(col => columnIndexMap[col])
        .filter(index => index !== undefined);
      
      if (selectedColumnIndices.length === 0) {
        throw new Error('Không có cột nào được chọn');
      }
      
      // Đọc dữ liệu từ hàng 4 trở đi (sau hàng 2 và 3 chứa tên cột)
      // Nếu header ở hàng 2 (index 1), data bắt đầu từ hàng 4 (index 3)
      // Nếu header ở hàng 3 (index 2), data bắt đầu từ hàng 4 (index 3)
      const dataStartRow = 3; // Luôn bắt đầu từ hàng 4 (index 3)
      const jsonData = rawData.slice(dataStartRow)
        .filter(row => {
          // Chỉ lấy row có ít nhất một cell có dữ liệu trong các cột được chọn
          if (!Array.isArray(row)) return false;
          return selectedColumnIndices.some(index => {
            const value = row[index];
            return value !== '' && value !== null && value !== undefined;
          });
        })
        .map((row: any[]) => {
          const obj: ExcelData = {};
          // Chỉ lấy các cột được chọn
          selectedColumns.forEach(colName => {
            const colIndex = columnIndexMap[colName];
            if (colIndex !== undefined) {
              const value = row[colIndex];
              obj[colName] = value !== undefined && value !== null && value !== '' 
                ? String(value).trim() 
                : '';
            }
          });
          return obj;
        }) as ExcelData[];
      
      if (jsonData.length === 0) {
        this.snackBar.open('File Excel không có dữ liệu sau dòng header', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        this.isLoading.set(false);
        return;
      }
      
      // Cập nhật columnLabels trước
      selectedColumns.forEach(col => {
        if (!this.columnLabels[col]) {
          // Nếu cột có suffix "TH" kèm số (TH1, TH2, ...), giữ nguyên format
          const thMatch = col.match(/^(.+?)\s+TH(\d+)$/);
          if (thMatch) {
            const originalName = thMatch[1];
            const thNumber = thMatch[2];
            this.columnLabels[col] = `${originalName} TH${thNumber}`;
          } else {
            this.columnLabels[col] = col;
          }
        }
      });
      
      // Cập nhật column visibility
      const visibility: ColumnVisibility = {};
      selectedColumns.forEach(col => {
        visibility[col] = true; // Mặc định hiển thị tất cả các cột được chọn
      });
      this.columnVisibility.set(visibility);
      
      // Cập nhật allColumns và displayedColumns - phải set trước khi set data
      // Tạo một array mới để trigger change detection
      this.allColumns.set([...selectedColumns]);
      this.displayedColumns.set([...selectedColumns]);
      
      // Force change detection để Angular render các cột mới
      this.cdr.detectChanges();
      
      // Đợi một chút để Angular render các cột mới
      setTimeout(() => {
        // Cập nhật dữ liệu - effect sẽ tự động cập nhật dataSource
        this.excelData.set(jsonData);
        
        // Force change detection lại sau khi set data
        this.cdr.detectChanges();
        
        // Đảm bảo paginator được cập nhật sau khi data thay đổi
        setTimeout(() => {
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
          this.pageIndex.set(0);
          if (this.paginator) {
            this.paginator.firstPage();
          }
          this.isLoading.set(false);
          this.cdr.detectChanges();
        }, 100);
      }, 50);
      
      this.snackBar.open(`Đã đọc ${jsonData.length} dòng dữ liệu từ ${selectedColumns.length} cột trong file "${fileName}"`, 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
      
    } catch (error) {
      console.error('Error reading data with selected columns:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      this.snackBar.open(`Lỗi khi đọc dữ liệu: ${errorMessage}`, 'Đóng', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      this.isLoading.set(false);
    }
  }

  private extractColumns(data: ExcelData[]): string[] {
    if (data.length === 0) return [];
    
    const columns = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        columns.add(key);
      });
    });
    
    return Array.from(columns).sort();
  }

  private mapExcelDataToFixedColumns(data: ExcelData[], excelColumns: string[]): ExcelData[] {
    // Tạo mapping từ Excel columns sang fixed columns
    // Tìm cột Excel phù hợp với từng fixed column
    const columnMapping: { [key: string]: string } = {};
    const usedColumns = new Set<string>();
    
    // Định nghĩa các pattern matching cho từng cột
    const mappingPatterns: { [key: string]: (colName: string) => boolean } = {
      'CongSuat': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'công suất' || lower === 'congsuat' || lower === 'cong suat' ||
               lower === 'cong_suat' || lower.includes('công suất') || lower.includes('congsuat') ||
               (lower.includes('công') && lower.includes('suất'));
      },
      'SoMay': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'số máy' || lower === 'somay' || lower === 'so may' ||
               lower === 'so_may' || lower === 'sốmáy' || lower.includes('số máy') ||
               lower.includes('somay') || (lower.includes('số') && lower.includes('máy'));
      },
      'SBB': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'sbb' || lower.startsWith('sbb') || lower.endsWith('sbb');
      },
      'LSX': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'lsx' || lower.startsWith('lsx') || lower.endsWith('lsx');
      },
      'TChuanLSX': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 't.chuẩn lsx' || lower === 'tchuanlsx' || lower === 't chuẩn lsx' ||
               lower === 't_chuan_lsx' || lower.includes('t.chuẩn') && lower.includes('lsx') ||
               lower.includes('t chuẩn') && lower.includes('lsx') || 
               lower.includes('tchuan') && lower.includes('lsx') ||
               lower === 't.chuẩn lsx' || lower === 'tiêu chuẩn lsx';
      },
      'TBKT': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'tbkt' || lower.startsWith('tbkt') || lower.endsWith('tbkt');
      },
      'Po': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'po' || lower === 'po (w)' || lower.startsWith('po') || lower.endsWith('po');
      },
      'Io': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'io' || lower === 'io (%)' || lower.startsWith('io') || lower.endsWith('io');
      },
      'Pk75H1': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'pk75(h1)' || lower === 'pk75h1' || lower.includes('pk75') && lower.includes('h1');
      },
      'Pk75H2': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'pk75(h2)' || lower === 'pk75h2' || lower.includes('pk75') && lower.includes('h2');
      },
      'Uk75H1': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'uk75(h1)' || lower === 'uk75h1' || lower.includes('uk75') && lower.includes('h1');
      },
      'Uk75H2': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'uk75(h2)' || lower === 'uk75h2' || lower.includes('uk75') && lower.includes('h2');
      },
      'UdmHVH1': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'uđm hv(h1)' || lower === 'udmhvh1' || lower.includes('uđm') && lower.includes('hv') && lower.includes('h1');
      },
      'UdmHVH2': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'uđm hv(h2)' || lower === 'udmhvh2' || lower.includes('uđm') && lower.includes('hv') && lower.includes('h2');
      },
      'UdmLV': (colName: string) => {
        const lower = colName.toLowerCase().trim();
        return lower === 'uđm lv' || lower === 'udmlv' || lower.includes('uđm') && lower.includes('lv');
      }
    };
    
    this.fixedColumns.forEach((fixedCol, index) => {
      // Tìm cột Excel có tên khớp chính xác trước
      let excelCol = excelColumns.find(col => {
        if (usedColumns.has(col)) return false;
        
        const colTrimmed = col.trim();
        const pattern = mappingPatterns[fixedCol];
        
        if (pattern) {
          return pattern(colTrimmed);
        }
        
        // Fallback: so sánh không phân biệt hoa thường
        return colTrimmed.toLowerCase() === fixedCol.toLowerCase();
      });
      
      // Nếu không tìm thấy, thử tìm gần đúng (contains)
      if (!excelCol) {
        excelCol = excelColumns.find(col => {
          if (usedColumns.has(col)) return false;
          
          const colLower = col.toLowerCase().trim();
          const fixedLower = fixedCol.toLowerCase();
          
          // Tìm các pattern khác
          if (fixedCol === 'CongSuat') {
            return (colLower.includes('công') || colLower.includes('cong')) && 
                   (colLower.includes('suất') || colLower.includes('suat'));
          } else if (fixedCol === 'SoMay') {
            return colLower.includes('số') && colLower.includes('máy');
          } else if (fixedCol === 'SBB') {
            return colLower.includes('sbb');
          } else if (fixedCol === 'LSX') {
            return colLower.includes('lsx');
          } else if (fixedCol === 'TChuanLSX') {
            return (colLower.includes('chuẩn') || colLower.includes('chuan')) && 
                   (colLower.includes('lsx') || colLower.includes('ls x'));
          } else if (fixedCol === 'TBKT') {
            return colLower.includes('tbkt');
          } else if (fixedCol === 'Po') {
            return colLower.includes('po');
          } else if (fixedCol === 'Io') {
            return colLower.includes('io');
          } else if (fixedCol === 'Pk75H1') {
            return colLower.includes('pk75') && colLower.includes('h1');
          } else if (fixedCol === 'Pk75H2') {
            return colLower.includes('pk75') && colLower.includes('h2');
          } else if (fixedCol === 'Uk75H1') {
            return colLower.includes('uk75') && colLower.includes('h1');
          } else if (fixedCol === 'Uk75H2') {
            return colLower.includes('uk75') && colLower.includes('h2');
          } else if (fixedCol === 'UdmHVH1') {
            return (colLower.includes('uđm') || colLower.includes('udm')) && 
                   colLower.includes('hv') && colLower.includes('h1');
          } else if (fixedCol === 'UdmHVH2') {
            return (colLower.includes('uđm') || colLower.includes('udm')) && 
                   colLower.includes('hv') && colLower.includes('h2');
          } else if (fixedCol === 'UdmLV') {
            return (colLower.includes('uđm') || colLower.includes('udm')) && 
                   colLower.includes('lv');
          }
          
          return colLower.includes(fixedLower);
        });
      }
      
      // Nếu vẫn không tìm thấy, không dùng fallback - để trống
      // (không map cột khác vào để tránh hiển thị sai)
      
      if (excelCol) {
        columnMapping[fixedCol] = excelCol;
        usedColumns.add(excelCol);
      }
    });
    
    // Log mapping để debug
    console.log('Excel Columns:', excelColumns);
    console.log('Column Mapping:', columnMapping);
    console.log('Unmapped columns:', excelColumns.filter(col => !usedColumns.has(col)));
    
    // Map dữ liệu
    const mappedData = data.map((row, rowIndex) => {
      const mappedRow: ExcelData = {};
      this.fixedColumns.forEach(fixedCol => {
        const excelCol = columnMapping[fixedCol];
        if (excelCol && row[excelCol] !== undefined && row[excelCol] !== null && row[excelCol] !== '') {
          mappedRow[fixedCol] = row[excelCol];
        } else {
          mappedRow[fixedCol] = '';
        }
      });
      
      // Log sample rows để debug
      if (rowIndex < 3) {
        console.log(`Row ${rowIndex + 1} - Original:`, row);
        console.log(`Row ${rowIndex + 1} - Mapped:`, mappedRow);
      }
      
      return mappedRow;
    });
    
    console.log('Total mapped rows:', mappedData.length);
    console.log('Sample mapped data (first 3 rows):', mappedData.slice(0, 3));
    
    return mappedData;
  }

  updateDataSource() {
    // Effect sẽ tự động cập nhật dataSource khi filteredData thay đổi
    // Reset về trang đầu nếu cần
    if (this.pageIndex() > 0) {
      this.pageIndex.set(0);
      if (this.paginator) {
        this.paginator.firstPage();
      }
    }
  }

  toggleColumnVisibility(column: string) {
    const visibility = { ...this.columnVisibility() };
    visibility[column] = !visibility[column];
    this.columnVisibility.set(visibility);
    
    // Cập nhật displayedColumns
    const visibleColumns = this.allColumns().filter(col => visibility[col]);
    this.displayedColumns.set(visibleColumns);
  }

  showAllColumns() {
    const visibility: ColumnVisibility = {};
    const allCols = this.allColumns();
    allCols.forEach(col => {
      visibility[col] = true;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([...allCols]);
  }

  hideAllColumns() {
    const visibility: ColumnVisibility = {};
    const allCols = this.allColumns();
    allCols.forEach(col => {
      visibility[col] = false;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([]);
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }

  trackByColumn(index: number, column: string): string {
    return column;
  }

  setSelectedRow(row: ExcelData, rowIndex: number) {
    this.selectedRow = row;
    this.selectedRowIndex = rowIndex;
  }

  viewRow() {
    if (!this.selectedRow) return;
    
    // Hiển thị thông tin chi tiết của dòng
    const rowData = this.selectedRow;
    const columns = this.allColumns();
    let message = 'Thông tin chi tiết:\n\n';
    
    columns.forEach(col => {
      const value = rowData[col];
      const label = this.getColumnLabel(col);
      message += `${label}: ${this.formatCellValue(value)}\n`;
    });
    
    // Có thể mở dialog để hiển thị chi tiết
    alert(message);
    
    // Hoặc có thể mở dialog component để hiển thị đẹp hơn
    // this.dialog.open(RowDetailDialogComponent, { data: { row: this.selectedRow, columns: columns } });
  }

  editRow() {
    if (!this.selectedRow) return;
    
    // Hiển thị thông báo hoặc mở dialog chỉnh sửa
    this.snackBar.open('Chức năng chỉnh sửa đang được phát triển', 'Đóng', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
    
    // Có thể mở dialog để chỉnh sửa
    // this.dialog.open(EditRowDialogComponent, { data: { row: this.selectedRow, columns: this.allColumns() } });
  }

  deleteRow() {
    if (!this.selectedRow) return;
    
    // Xác nhận trước khi xóa
    const confirmed = confirm('Bạn có chắc chắn muốn xóa dòng này?');
    if (!confirmed) return;
    
    // Tìm index thực tế trong excelData (không phải trong filteredData)
    const currentData = this.excelData();
    const rowIndex = currentData.findIndex(row => {
      // So sánh tất cả các giá trị để tìm đúng dòng
      return Object.keys(this.selectedRow!).every(key => {
        return row[key] === this.selectedRow![key];
      });
    });
    
    if (rowIndex === -1) {
      this.snackBar.open('Không tìm thấy dòng cần xóa', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    // Xóa dòng khỏi data
    const filteredData = currentData.filter((_, index) => index !== rowIndex);
    this.excelData.set(filteredData);
    
    // Reset selected row
    this.selectedRow = null;
    this.selectedRowIndex = -1;
    
    this.snackBar.open('Đã xóa dòng thành công', 'Đóng', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    // Update dataSource khi search thay đổi
    // Sử dụng setTimeout để đảm bảo signal được cập nhật trước
    setTimeout(() => {
      this.updateDataSource();
    }, 0);
  }

  clearData() {
    this.excelData.set([]);
    this.dynamicColumns.set([]);
    this.displayedColumns.set([...this.defaultVisibleColumns]);
    this.allColumns.set([...this.fixedColumns]);
    // Reset visibility về mặc định (6 cột đầu)
    const visibility: ColumnVisibility = {};
    this.fixedColumns.forEach(col => {
      visibility[col] = this.defaultVisibleColumns.includes(col);
    });
    this.columnVisibility.set(visibility);
    this.searchTerm.set('');
    this.dataSource.data = [];
  }

  formatCellValue(value: any): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  // Expose Math to template
  Math = Math;

  readonly pageInfo = computed(() => {
    const filteredLength = this.filteredData().length;
    if (filteredLength === 0) {
      return '';
    }
    
    // Sử dụng actualPageSize để tính toán chính xác
    const pageSize = this.actualPageSize();
    const pageIndex = this.pageIndex();
    
    // Nếu hiển thị tất cả (pageSize >= total), hiển thị 1 - total
    if (pageSize >= filteredLength) {
      return `1 - ${filteredLength}`;
    }
    
    const start = pageIndex * pageSize + 1;
    const end = Math.min(pageIndex * pageSize + pageSize, filteredLength);
    return `${start} - ${end}`;
  });

}

