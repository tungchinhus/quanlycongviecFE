import { Component, OnInit, signal, computed, ViewChild, AfterViewInit, effect } from '@angular/core';
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
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import * as XLSX from 'xlsx';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';
import { TSMayService } from '../../services/tsmay.service';
import { CreateTSMayRequest } from '../../models/tsmay.model';

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
  readonly isSaving = signal<boolean>(false);
  
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
  
  // Computed để thêm cột settings vào cuối
  readonly displayedColumnsWithSettings = computed(() => {
    return [...this.displayedColumns(), 'columnSettings'];
  });
  
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
    // Chỉ Administrator mới thấy Excel Reader
    return this.authService.hasRole(UserRole.Administrator);
  });

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private tsMayService: TSMayService
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
        
        // Đọc dữ liệu dạng array of arrays
        // Cột A (index 0): Công suất
        // Cột B (index 1): Số Máy
        // Cột C (index 2): SBB
        // Cột D (index 3): LSX
        // Cột E (index 4): T.Chuẩn LSX
        // Cột F (index 5): TBKT
        // Cột G (index 6): Po
        // Cột H (index 7): Io
        // Cột I (index 8): Pk75(H1)
        // Cột J (index 9): Pk75(H2)
        // Cột K (index 10): Uk75(H1)
        // Cột L (index 11): Uk75(H2)
        // Cột M (index 12): Uđm HV(H1)
        // Cột N (index 13): Uđm HV(H2)
        // Cột O (index 14): Uđm LV
        // Dữ liệu bắt đầu từ row 4 (index 3)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          defval: '',
          blankrows: false,
          header: 1 // Đọc dạng array of arrays
        }) as any[][];
        
        if (!rawData || rawData.length === 0) {
          throw new Error('File Excel không có dữ liệu');
        }
        
        console.log('Raw data rows:', rawData.length);
        console.log('First few rows:', rawData.slice(0, 5));
        
        // Bỏ qua 3 dòng đầu (row 1, 2, 3), bắt đầu từ row 4 (index 3)
        const dataStartRow = 3; // Row 4 trong Excel = index 3 trong array
        
        // Map cột theo vị trí:
        // Column A (index 0) -> CongSuat
        // Column B (index 1) -> SoMay
        // Column C (index 2) -> SBB
        // Column D (index 3) -> LSX
        // Column E (index 4) -> TChuanLSX
        // Column F (index 5) -> TBKT
        // Column G (index 6) -> Po
        // Column H (index 7) -> Io
        // Column I (index 8) -> Pk75H1
        // Column J (index 9) -> Pk75H2
        // Column K (index 10) -> Uk75H1
        // Column L (index 11) -> Uk75H2
        // Column M (index 12) -> UdmHVH1
        // Column N (index 13) -> UdmHVH2
        // Column O (index 14) -> UdmLV
        const columnMapping: { [key: number]: string } = {
          0: 'CongSuat',  // Column A
          1: 'SoMay',     // Column B
          2: 'SBB',       // Column C
          3: 'LSX',       // Column D
          4: 'TChuanLSX', // Column E
          5: 'TBKT',      // Column F
          6: 'Po',        // Column G
          7: 'Io',        // Column H
          8: 'Pk75H1',    // Column I
          9: 'Pk75H2',    // Column J
          10: 'Uk75H1',   // Column K
          11: 'Uk75H2',   // Column L
          12: 'UdmHVH1',  // Column M
          13: 'UdmHVH2',  // Column N
          14: 'UdmLV'     // Column O
        };
        
        // Convert data rows thành objects (bắt đầu từ row 4)
        const jsonData = rawData.slice(dataStartRow)
          .filter(row => {
            // Chỉ lấy row có ít nhất một cell có dữ liệu trong các cột A-O
            if (!Array.isArray(row)) return false;
            return row[0] !== '' && row[0] !== null && row[0] !== undefined ||
                   row[1] !== '' && row[1] !== null && row[1] !== undefined ||
                   row[2] !== '' && row[2] !== null && row[2] !== undefined ||
                   row[3] !== '' && row[3] !== null && row[3] !== undefined ||
                   row[4] !== '' && row[4] !== null && row[4] !== undefined ||
                   row[5] !== '' && row[5] !== null && row[5] !== undefined ||
                   row[6] !== '' && row[6] !== null && row[6] !== undefined ||
                   row[7] !== '' && row[7] !== null && row[7] !== undefined ||
                   row[8] !== '' && row[8] !== null && row[8] !== undefined ||
                   row[9] !== '' && row[9] !== null && row[9] !== undefined ||
                   row[10] !== '' && row[10] !== null && row[10] !== undefined ||
                   row[11] !== '' && row[11] !== null && row[11] !== undefined ||
                   row[12] !== '' && row[12] !== null && row[12] !== undefined ||
                   row[13] !== '' && row[13] !== null && row[13] !== undefined ||
                   row[14] !== '' && row[14] !== null && row[14] !== undefined;
          })
          .map((row: any[]) => {
            const obj: ExcelData = {};
            // Map các cột A-O vào fixed columns
            Object.keys(columnMapping).forEach(colIndex => {
              const fixedCol = columnMapping[parseInt(colIndex)];
              const value = row[parseInt(colIndex)];
              obj[fixedCol] = value !== undefined && value !== null && value !== '' ? String(value).trim() : '';
            });
            return obj;
          }) as ExcelData[];
        
        console.log('Data start row:', dataStartRow);
        console.log('Column mapping:', columnMapping);
        console.log('Mapped data rows:', jsonData.length);
        if (jsonData.length > 0) {
          console.log('First mapped row:', jsonData[0]);
        }
        
        if (jsonData.length === 0) {
          this.snackBar.open('File Excel không có dữ liệu từ row 4 trở đi', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.isLoading.set(false);
          input.value = '';
          return;
        }
        
        // Dữ liệu đã được map trực tiếp từ cột B-F, không cần map lại
        this.excelData.set(jsonData);
        
        // Effect sẽ tự động cập nhật dataSource
        // Chỉ cần đảm bảo paginator được gán lại
        setTimeout(() => {
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
          this.updateDataSource();
        }, 100);
        
        this.snackBar.open(`Đã đọc ${jsonData.length} dòng dữ liệu từ file "${file.name}"`, 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
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
      } finally {
        // Đảm bảo luôn set isLoading về false
        setTimeout(() => {
          this.isLoading.set(false);
        }, 100);
        // Reset input để có thể chọn lại file cùng tên
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
    this.fixedColumns.forEach(col => {
      visibility[col] = true;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([...this.fixedColumns]);
  }

  hideAllColumns() {
    const visibility: ColumnVisibility = {};
    this.fixedColumns.forEach(col => {
      visibility[col] = false;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([]);
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
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
    this.displayedColumns.set([...this.defaultVisibleColumns]);
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

  /**
   * Chuyển đổi ExcelData sang CreateTSMayRequest
   */
  private mapExcelDataToTSMayRequest(data: ExcelData): CreateTSMayRequest {
    // Helper function để parse số hoặc trả về null
    const parseNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseInt(String(value));
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function để lấy string hoặc null
    const getStringOrNull = (value: any): string | null => {
      if (value === null || value === undefined || value === '') return null;
      const str = String(value).trim();
      return str === '' ? null : str;
    };

    return {
      congSuat: parseNumber(data['CongSuat']),
      soMay: getStringOrNull(data['SoMay']),
      sbb: getStringOrNull(data['SBB']),
      lsx: getStringOrNull(data['LSX']),
      tChuanLSX: getStringOrNull(data['TChuanLSX']),
      tbkt: getStringOrNull(data['TBKT']),
      po: getStringOrNull(data['Po']),
      io: getStringOrNull(data['Io']),
      pk75H1: getStringOrNull(data['Pk75H1']),
      pk75H2: getStringOrNull(data['Pk75H2']),
      uk75H1: getStringOrNull(data['Uk75H1']),
      uk75H2: getStringOrNull(data['Uk75H2']),
      udmHVH1: getStringOrNull(data['UdmHVH1']),
      udmHVH2: getStringOrNull(data['UdmHVH2']),
      udmLV: getStringOrNull(data['UdmLV'])
    };
  }

  /**
   * Lưu dữ liệu vào database
   */
  async saveToDatabase() {
    const data = this.excelData();
    
    if (data.length === 0) {
      this.snackBar.open('Không có dữ liệu để lưu', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Xác nhận trước khi lưu
    const confirmed = confirm(`Bạn có chắc chắn muốn lưu ${data.length} dòng dữ liệu vào database?`);
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);

    try {
      // Map dữ liệu Excel sang format API
      const items: CreateTSMayRequest[] = data.map(row => this.mapExcelDataToTSMayRequest(row));

      // Gọi API bulk create
      this.tsMayService.bulkCreate({ items }).subscribe({
        next: (response) => {
          this.isSaving.set(false);
          
          if (response.success) {
            this.snackBar.open(
              `Đã lưu thành công ${response.created}/${response.total} dòng vào database`,
              'Đóng',
              {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['success-snackbar']
              }
            );
          } else {
            let message = `Đã lưu ${response.created}/${response.total} dòng. `;
            if (response.failed > 0) {
              message += `${response.failed} dòng thất bại.`;
            }
            
            this.snackBar.open(message, 'Đóng', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            });

            // Log errors nếu có
            if (response.errors && response.errors.length > 0) {
              console.error('Lỗi khi lưu dữ liệu:', response.errors);
            }
          }
        },
        error: (error) => {
          this.isSaving.set(false);
          console.error('Error saving to database:', error);
          
          const errorMessage = error.error?.message || error.message || 'Lỗi không xác định';
          this.snackBar.open(`Lỗi khi lưu dữ liệu: ${errorMessage}`, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } catch (error) {
      this.isSaving.set(false);
      console.error('Error preparing data:', error);
      this.snackBar.open('Lỗi khi chuẩn bị dữ liệu', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }
}

