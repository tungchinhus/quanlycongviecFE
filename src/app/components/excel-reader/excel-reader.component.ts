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
// Sử dụng bản XLSX hỗ trợ style để có thể format font, alignment khi xuất Excel
import * as XLSX from 'xlsx-js-style';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';
import { ColumnSelectionDialogComponent, ColumnSelectionData } from './column-selection-dialog.component';
import { ExportColumnMappingDialogComponent, ExportColumnMapping, ExportColumnMappingData } from './export-column-mapping-dialog.component';

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
    'Pk75H1': 'Pk75 (W)_H1',
    'Pk75H2': 'Pk75 (W)_H2',
    'Uk75H1': 'Uk75 (%)_H1',
    'Uk75H2': 'Uk75 (%)_H2',
    'UdmHVH1': 'Uđm HV_H1',
    'UdmHVH2': 'Uđm HV_H2',
    'UdmLV': 'Uđm LV'
  };
  
  // 6 cột đầu hiển thị mặc định
  readonly defaultVisibleColumns = ['CongSuat', 'SoMay', 'SBB', 'LSX', 'TChuanLSX', 'TBKT'];
  
  readonly displayedColumns = signal<string[]>(this.defaultVisibleColumns);
  readonly allColumns = signal<string[]>(this.fixedColumns);
  readonly dynamicColumns = signal<string[]>([]); // Các cột động từ file Excel
  readonly columnParentHeaderMap = signal<{ [key: string]: string }>({}); // Map cột -> parent header
  
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
        
        // Map để lưu parent header cho mỗi cột
        const parentHeaderMap: { [key: string]: string } = {};
        
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
              // Lưu parent header cho cột này
              parentHeaderMap[columnName] = mainHeader.trim();
            } else {
              // Nếu không có sub-header nhưng có header chính, dùng header chính
              columnName = mainHeader.trim();
            }
          } else if (subHeader) {
            // Nếu không có header chính nhưng có sub-header, tìm parent header từ các cột trước đó (merged cells)
            let foundParentHeader = '';
            if (index > 0) {
              // Tìm ngược lại để tìm parent header gần nhất
              for (let i = index - 1; i >= 0; i--) {
                const prevMainHeader = mainHeaderMap[i];
                if (prevMainHeader && prevMainHeader.trim()) {
                  foundParentHeader = prevMainHeader.trim();
                  break;
                }
              }
            }
            
            // Nếu tìm được parent header, kết hợp với sub-header để tạo tên duy nhất
            if (foundParentHeader) {
              const cleanMainHeader = foundParentHeader.trim().replace(/\s+/g, '');
              columnName = `${subHeader}_${cleanMainHeader}`;
              parentHeaderMap[columnName] = foundParentHeader;
            } else {
              // Nếu không tìm được parent header, LUÔN thêm index để đảm bảo unique
              // Format: H2_col0, H2_col1, etc. (sẽ được format lại bằng getColumnLabel để hiển thị đẹp)
              columnName = `${subHeader}_col${index}`;
            }
          } else {
            // Nếu không có cả hai, dùng tên mặc định
            columnName = `Cột ${String.fromCharCode(65 + index)}`; // A, B, C, ...
          }
          
          // Đảm bảo tên cột là unique - nếu đã tồn tại, thêm index
          let finalColumnName = columnName;
          let counter = 0;
          while (allColumns.includes(finalColumnName)) {
            counter++;
            finalColumnName = `${columnName}_${counter}`;
          }
          
          allColumns.push(finalColumnName);
          
          // Cập nhật parentHeaderMap nếu tên cột bị thay đổi
          if (finalColumnName !== columnName && parentHeaderMap[columnName]) {
            parentHeaderMap[finalColumnName] = parentHeaderMap[columnName];
            delete parentHeaderMap[columnName];
          }
        }
        
        // Lưu parent header map
        this.columnParentHeaderMap.set(parentHeaderMap);
        
        if (allColumns.length === 0) {
          throw new Error('Không tìm thấy cột nào trong file');
        }
        
        // Lưu danh sách cột vào allColumns trước để getColumnLabel có thể sử dụng
        // Loại bỏ duplicate: chỉ lấy các cột từ Excel (dynamicColumns), không merge với fixedColumns
        // Vì fixedColumns chỉ dùng cho mapping, không phải để hiển thị trong table
        this.allColumns.set([...allColumns]);
        
        // Reset displayedColumns để chỉ chứa các cột từ Excel (tránh lỗi không tìm thấy cột)
        // Chọn một số cột đầu tiên làm mặc định hiển thị
        const defaultExcelColumns = allColumns.slice(0, Math.min(6, allColumns.length));
        this.displayedColumns.set([...defaultExcelColumns]);
        
        // Reset column visibility cho các cột từ Excel
        const visibility: ColumnVisibility = {};
        allColumns.forEach(col => {
          visibility[col] = defaultExcelColumns.includes(col);
        });
        this.columnVisibility.set(visibility);
        
        // Đóng loading và mở dialog chọn cột
        this.isLoading.set(false);
        
        // Format tên cột trước khi hiển thị trong dialog (sau khi đã set allColumns)
        const formattedColumns = allColumns.map(col => this.getColumnLabel(col));
        
        // Mở dialog để chọn cột
        const dialogRef = this.dialog.open(ColumnSelectionDialogComponent, {
          width: '600px',
          maxWidth: '90vw',
          data: {
            columns: allColumns, // Giữ nguyên tên cột gốc để mapping
            formattedColumns: formattedColumns, // Tên cột đã format để hiển thị
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
    // 1. Kiểm tra xem có trong columnLabels không (cho các cột cố định)
    if (this.columnLabels[column]) {
      return this.columnLabels[column];
    }
    
    // 2. Tách parent header và sub-header từ tên cột hiện tại (nếu có)
    const { parentHeader: existingParent, subHeader: existingSub } = this.extractParentAndSubHeader(column);
    
    // 3. Nếu cột đã có đầy đủ parent header và sub-header, trả về luôn
    if (existingParent && existingSub) {
      const normalizedParent = this.normalizeParentHeader(existingParent);
      return `${normalizedParent}_${existingSub}`;
    }
    
    // 4. Xác định sub-header
    let subHeader = existingSub;
    if (!subHeader) {
      // Kiểm tra xem có phải là sub-header không (H1, H2, hoặc kết thúc bằng _H1, _H2)
      if (column === 'H1' || column === 'H2') {
        subHeader = column;
      } else if (column.endsWith('_H1') || column.endsWith('_H2')) {
        subHeader = column.split('_').pop() || '';
      } else if (column.startsWith('H1_col') || column.startsWith('H2_col')) {
        // Xử lý format H2_col0, H2_col1, etc.
        subHeader = column.startsWith('H1_col') ? 'H1' : 'H2';
      }
    }
    
    // 5. Nếu là sub-header, tìm parent header từ các nguồn
    if (subHeader) {
      const allCols = this.allColumns();
      const currentIndex = allCols.indexOf(column);
      let foundParentHeader: string | null = null;
      
      // 5.1. Kiểm tra trong parentHeaderMap trước (đã lưu khi đọc Excel)
      const parentHeaderMap = this.columnParentHeaderMap();
      if (parentHeaderMap[column]) {
        foundParentHeader = parentHeaderMap[column];
      }
      
      // 5.2. Nếu không có trong map, tìm từ cột trước đó (ưu tiên cột H1 cùng nhóm)
      if (!foundParentHeader && currentIndex > 0) {
        const prevColumn = allCols[currentIndex - 1];
        
        // 5.2.1. Nếu cột trước đó có format "ParentHeader_H1" hoặc "ParentHeader_H2"
        if (prevColumn && (prevColumn.endsWith('_H1') || prevColumn.endsWith('_H2'))) {
          foundParentHeader = prevColumn.replace(/_H[12]$/, '');
        }
        // 5.2.2. Nếu cột trước đó là "H1" hoặc "H1_colX" (cùng nhóm với "H2" hiện tại)
        else if ((prevColumn === 'H1' || prevColumn.startsWith('H1_col')) && 
                 (subHeader === 'H2' || column.startsWith('H2_col'))) {
          // Tìm ngược lại để tìm parent header (bỏ qua các cột sub-header)
          for (let i = currentIndex - 2; i >= 0; i--) {
            const checkCol = allCols[i];
            // Bỏ qua các cột sub-header
            if (checkCol && checkCol !== 'H1' && checkCol !== 'H2' && 
                !checkCol.endsWith('_H1') && !checkCol.endsWith('_H2') &&
                !checkCol.startsWith('H1_col') && !checkCol.startsWith('H2_col')) {
              foundParentHeader = checkCol;
              break;
            }
          }
        }
        // 5.2.3. Nếu cột trước đó có format "ParentHeader_H1" hoặc "H1_colX", lấy parent header
        else if (prevColumn && (prevColumn.includes('_H1') || prevColumn.startsWith('H1_col'))) {
          if (prevColumn.includes('_H1')) {
            foundParentHeader = prevColumn.replace(/_H1$/, '');
          } else if (prevColumn.startsWith('H1_col')) {
            // Tìm parent header từ các cột trước đó
            for (let i = currentIndex - 2; i >= 0; i--) {
              const checkCol = allCols[i];
              if (checkCol && checkCol !== 'H1' && checkCol !== 'H2' && 
                  !checkCol.endsWith('_H1') && !checkCol.endsWith('_H2') &&
                  !checkCol.startsWith('H1_col') && !checkCol.startsWith('H2_col')) {
                foundParentHeader = checkCol;
                break;
              }
            }
          }
        }
        // 5.2.4. Nếu cột trước đó có chứa parent header keywords, phát hiện
        else if (prevColumn) {
          foundParentHeader = this.detectParentHeader(prevColumn);
        }
      }
      
      // 5.3. Nếu không tìm được từ context, thử phát hiện từ chính tên cột
      if (!foundParentHeader) {
        foundParentHeader = this.detectParentHeader(column);
      }
      
      // 5.4. Chuẩn hóa parent header và kết hợp với sub-header
      if (foundParentHeader) {
        const normalizedParent = this.normalizeParentHeader(foundParentHeader);
        // Luôn kết hợp parent header với sub-header để tạo tên cột đầy đủ
        return `${normalizedParent}_${subHeader}`;
      }
      
      // 5.5. Nếu không tìm được parent header, chỉ trả về sub-header (fallback)
      return subHeader;
    }
    
    // 6. Nếu không phải sub-header, kiểm tra xem có parent header không
    if (existingParent) {
      const normalizedParent = this.normalizeParentHeader(existingParent);
      return normalizedParent;
    }
    
    // 7. Trả về tên cột gốc nếu không xử lý được
    return column;
  }
  
  /**
   * Tách parent header và sub-header từ tên cột
   */
  private extractParentAndSubHeader(column: string): { parentHeader: string | null; subHeader: string | null } {
    if (!column) return { parentHeader: null, subHeader: null };
    
    // Kiểm tra format: ParentHeader_SubHeader hoặc ParentHeader_H1/H2
    if (column.includes('_')) {
      const parts = column.split('_');
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        // Nếu phần cuối là H1 hoặc H2, đó là sub-header
        if (lastPart === 'H1' || lastPart === 'H2') {
          const parentHeader = parts.slice(0, -1).join('_');
          return { parentHeader, subHeader: lastPart };
        }
        // Nếu không, có thể là format khác
        return { parentHeader: parts[0], subHeader: parts.slice(1).join('_') };
      }
    }
    
    // Nếu chỉ là H1 hoặc H2
    if (column === 'H1' || column === 'H2') {
      return { parentHeader: null, subHeader: column };
    }
    
    return { parentHeader: null, subHeader: null };
  }
  
  /**
   * Lấy sub-header suffix từ tên cột (H1, H2, _H1, _H2)
   */
  private getSubHeaderSuffix(column: string): string {
    if (column.endsWith('_H1')) return '_H1';
    if (column.endsWith('_H2')) return '_H2';
    if (column === 'H1') return '_H1';
    if (column === 'H2') return '_H2';
    return '';
  }
  
  /**
   * Chuẩn hóa parent header (thêm định dạng chuẩn)
   */
  private normalizeParentHeader(header: string): string {
    if (!header) return header;
    
    const lower = header.toLowerCase().trim();
    
    // Kiểm tra các nhóm cột đã biết
    if (lower.includes('pk75') || lower.includes('pk 75')) {
      return 'Pk75 (W)';
    } else if (lower.includes('uk75') || lower.includes('uk 75')) {
      return 'Uk75 (%)';
    } else if (lower.includes('uđm hv') || lower.includes('udmhv') || lower.includes('udm hv')) {
      return 'Uđm HV';
    }
    
    // Trả về header gốc nếu không match
    return header.trim();
  }
  
  /**
   * Phát hiện parent header từ tên cột
   */
  private detectParentHeader(column: string): string | null {
    if (!column) return null;
    
    const lower = column.toLowerCase();
    
    if (lower.includes('pk75') || lower.includes('pk 75')) {
      return 'Pk75 (W)';
    } else if (lower.includes('uk75') || lower.includes('uk 75')) {
      return 'Uk75 (%)';
    } else if (lower.includes('uđm hv') || lower.includes('udmhv') || lower.includes('udm hv')) {
      return 'Uđm HV';
    }
    
    return null;
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
    this.columnParentHeaderMap.set({});
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

  getParentHeaderLabel(column: string): string {
    // Nhóm Pk75 (W)
    if (column === 'Pk75H1') {
      return 'Pk75 (W)';
    }
    
    // Nhóm Uk75 (%)
    if (column === 'Uk75H1') {
      return 'Uk75 (%)';
    }
    
    // Nhóm Uđm HV
    if (column === 'UdmHVH1') {
      return 'Uđm HV';
    }
    
    // Các cột khác không có parent header
    return '';
  }

  getParentHeaderColspan(column: string): number {
    const columns = this.displayedColumnsWithSettings();
    
    // Nhóm Pk75 (W)
    if (column === 'Pk75H1') {
      const pk75H1Index = columns.indexOf('Pk75H1');
      const pk75H2Index = columns.indexOf('Pk75H2');
      if (pk75H1Index !== -1 && pk75H2Index === pk75H1Index + 1) {
        return 2;
      }
      return 1;
    }
    if (column === 'Pk75H2') {
      return 0;
    }
    
    // Nhóm Uk75 (%)
    if (column === 'Uk75H1') {
      const uk75H1Index = columns.indexOf('Uk75H1');
      const uk75H2Index = columns.indexOf('Uk75H2');
      if (uk75H1Index !== -1 && uk75H2Index === uk75H1Index + 1) {
        return 2;
      }
      return 1;
    }
    if (column === 'Uk75H2') {
      return 0;
    }
    
    // Nhóm Uđm HV
    if (column === 'UdmHVH1') {
      const udmHVH1Index = columns.indexOf('UdmHVH1');
      const udmHVH2Index = columns.indexOf('UdmHVH2');
      if (udmHVH1Index !== -1 && udmHVH2Index === udmHVH1Index + 1) {
        return 2;
      }
      return 1;
    }
    if (column === 'UdmHVH2') {
      return 0;
    }
    
    // Các cột khác colspan = 1
    return 1;
  }

  isMergedHeader(column: string): boolean {
    return column === 'Pk75H1' || column === 'Uk75H1' || column === 'UdmHVH1';
  }

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
   * Tính độ lệch chuẩn
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Chuyển đổi giá trị sang số
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? null : num;
  }

  /**
   * Phân loại máy dựa trên số máy
   */
  private getMachineType(soMay: any, mapping?: ExportColumnMapping): 'thuong' | 'lae' {
    const soMayStr = String(soMay || '').toLowerCase().trim();
    // Nếu số máy chứa "lae" hoặc "l.a.e" thì là máy mới L.A.E
    if (soMayStr.includes('lae') || soMayStr.includes('l.a.e')) {
      return 'lae';
    }
    // Mặc định là máy quấn thường
    return 'thuong';
  }

  /**
   * Xuất thống kê ra file Excel theo format thống kê
   */
  exportToExcel() {
    const data = this.filteredData();
    
    if (data.length === 0) {
      this.snackBar.open('Không có dữ liệu để xuất', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    // Lấy danh sách cột có sẵn
    const availableColumns = this.allColumns();
    
    // Mở dialog để mapping các cột
    const dialogRef = this.dialog.open(ExportColumnMappingDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: {
        availableColumns: availableColumns,
        columnLabels: this.columnLabels,
        currentMapping: undefined
      } as ExportColumnMappingData
    });
    
    dialogRef.afterClosed().subscribe((mapping: ExportColumnMapping | undefined) => {
      if (!mapping) {
        // Người dùng hủy
        return;
      }
      
      // Kiểm tra các cột bắt buộc
      if (!mapping.tbkt || !mapping.po) {
        this.snackBar.open('Vui lòng chọn đầy đủ các cột bắt buộc (TBKT, Po)', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      // Thực hiện xuất Excel với mapping
      this.performExport(data, mapping);
    });
  }

  /**
   * Thực hiện xuất Excel với mapping đã chọn
   */
  private performExport(data: ExcelData[], mapping: ExportColumnMapping) {
    try {
      // Lọc bỏ các dòng không có TBKT
      const validData = data.filter(row => {
        const tbkt = String(row[mapping.tbkt] || '').trim();
        return tbkt !== '';
      });
      
      if (validData.length === 0) {
        this.snackBar.open('Không có dữ liệu hợp lệ để xuất (thiếu TBKT)', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      // Nhóm dữ liệu theo Công suất và TBKT (sử dụng mapping)
      const groupedData: { [key: string]: ExcelData[] } = {};
      
      validData.forEach(row => {
        const congSuat = String(row[mapping.congSuat] || '').trim();
        const tbkt = String(row[mapping.tbkt] || '').trim();
        
        // Tạo key duy nhất cho mỗi nhóm (Công suất + TBKT)
        const key = `${congSuat}_${tbkt}`;
        
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(row);
      });
      
      // Tính toán thống kê cho mỗi nhóm
      const statisticsRows: any[] = [];
      
      // Sắp xếp các nhóm theo công suất và TBKT
      const sortedGroups = Object.keys(groupedData).sort((a, b) => {
        const [congSuatA, tbktA] = a.split('_');
        const [congSuatB, tbktB] = b.split('_');
        
        // Xử lý sắp xếp công suất: số trước, sau đó text
        const numA = parseFloat(congSuatA);
        const numB = parseFloat(congSuatB);
        
        // Nếu cả hai đều là số, sắp xếp theo số
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) return numA - numB;
        } else if (!isNaN(numA) && isNaN(numB)) {
          // Số đứng trước text
          return -1;
        } else if (isNaN(numA) && !isNaN(numB)) {
          // Text đứng sau số
          return 1;
        } else {
          // Cả hai đều là text, sắp xếp alphabet
          if (congSuatA !== congSuatB) return congSuatA.localeCompare(congSuatB);
        }
        
        // Nếu công suất giống nhau, sắp xếp theo TBKT
        return tbktA.localeCompare(tbktB);
      });
      
      // Log để debug
      console.log('Tổng số nhóm:', sortedGroups.length);
      console.log('Các nhóm:', sortedGroups);
      
      sortedGroups.forEach(key => {
        const [congSuat, tbkt] = key.split('_');
        const groupData = groupedData[key];
        
        console.log(`Nhóm: Công suất=${congSuat}, TBKT=${tbkt}, Số dòng=${groupData.length}`);
        
        // Tính toán thống kê cho toàn bộ nhóm (không phân loại máy)
        const stats = this.calculateStatistics(groupData, congSuat, tbkt, mapping);
        
        // Thêm 1 dòng thống kê cho mỗi nhóm
        statisticsRows.push(stats);
      });
      
      console.log('Tổng số dòng thống kê:', statisticsRows.length);
      
      // Tạo workbook
      const workbook = XLSX.utils.book_new();
      
      // Tạo worksheet với multi-level headers
      const worksheetData = this.createWorksheetData(statisticsRows);
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Merge cells cho title
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      const titleRow = 0;
      const titleCol = 0;
      const titleEndCol = 18; // Tổng số cột (có cột Công suất)
      worksheet['!merges'].push({
        s: { r: titleRow, c: titleCol },
        e: { r: titleRow, c: titleEndCol }
      });
      
      // Merge cells cho parent headers (row 1)
      const parentHeaderRow = 1;
      // Công suất: col 0, colspan 1
      // TBKT: col 1, colspan 1
      // Số mẫu: col 2, colspan 1
      // Pk H1: col 3, colspan 4
      worksheet['!merges'].push({ s: { r: parentHeaderRow, c: 3 }, e: { r: parentHeaderRow, c: 6 } });
      // Pk H2: col 7, colspan 4
      worksheet['!merges'].push({ s: { r: parentHeaderRow, c: 7 }, e: { r: parentHeaderRow, c: 10 } });
      // Uk H1: col 11, colspan 4
      worksheet['!merges'].push({ s: { r: parentHeaderRow, c: 11 }, e: { r: parentHeaderRow, c: 14 } });
      // Uk H2: col 15, colspan 4
      worksheet['!merges'].push({ s: { r: parentHeaderRow, c: 15 }, e: { r: parentHeaderRow, c: 18 } });
      
      // Merge cells cho Công suất theo nhóm (các TBKT cùng công suất)
      const dataStartRow = 3; // Data bắt đầu từ row 3 (sau title, parent header, sub header)
      let currentRow = dataStartRow;
      
      // Nhóm các dòng theo công suất để merge
      const congSuatGroups: { [key: string]: { startRow: number; endRow: number } } = {};
      let lastCongSuat = '';
      let startRowForCongSuat = dataStartRow;
      
      statisticsRows.forEach((stats, index) => {
        const congSuat = stats.congSuat || '';
        
        if (congSuat !== lastCongSuat) {
          // Nếu công suất thay đổi
          if (lastCongSuat !== '' && startRowForCongSuat < currentRow) {
            // Lưu nhóm công suất trước đó
            congSuatGroups[lastCongSuat] = {
              startRow: startRowForCongSuat,
              endRow: currentRow - 1
            };
          }
          // Bắt đầu nhóm công suất mới
          lastCongSuat = congSuat;
          startRowForCongSuat = currentRow;
        }
        
        currentRow++;
      });
      
      // Lưu nhóm công suất cuối cùng
      if (lastCongSuat !== '' && startRowForCongSuat < currentRow) {
        congSuatGroups[lastCongSuat] = {
          startRow: startRowForCongSuat,
          endRow: currentRow - 1
        };
      }
      
      // Merge cells cho Công suất
      Object.values(congSuatGroups).forEach(group => {
        if (group.endRow > group.startRow) {
          worksheet['!merges']!.push({ 
            s: { r: group.startRow, c: 0 }, 
            e: { r: group.endRow, c: 0 } 
          });
        }
      });
      
      // Đặt độ rộng cột (tối ưu hóa)
      worksheet['!cols'] = [
        { wch: 12 }, // Công suất
        { wch: 15 }, // TBKT
        { wch: 10 }, // Số mẫu
        { wch: 10 }, // Pk H1 max
        { wch: 10 }, // Pk H1 TB
        { wch: 10 }, // Pk H1 min
        { wch: 8 },  // Pk H1 δ
        { wch: 10 }, // Pk H2 max
        { wch: 10 }, // Pk H2 TB
        { wch: 10 }, // Pk H2 min
        { wch: 8 },  // Pk H2 δ
        { wch: 10 }, // Uk H1 max
        { wch: 10 }, // Uk H1 TB
        { wch: 10 }, // Uk H1 min
        { wch: 8 },  // Uk H1 δ
        { wch: 10 }, // Uk H2 max
        { wch: 10 }, // Uk H2 TB
        { wch: 10 }, // Uk H2 min
        { wch: 8 }   // Uk H2 δ
      ];

      // ===== Styling cho header theo yêu cầu =====
      // Hàng 1 (index 0): in đậm, font size 20, canh giữa
      const titleRowIndex = 0;
      const titleCellAddress = XLSX.utils.encode_cell({ r: titleRowIndex, c: 0 }); // A1
      const titleCell = worksheet[titleCellAddress];
      if (titleCell) {
        titleCell.s = {
          font: { bold: true, sz: 20 },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      // Hàng 2 và 3 (index 1 và 2): canh giữa nội dung
      const headerRowIndices = [1, 2];
      const totalColumns = 19; // 0 -> 18

      headerRowIndices.forEach(rowIndex => {
        for (let colIndex = 0; colIndex < totalColumns; colIndex++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const cell = worksheet[cellAddress];
          if (cell) {
            cell.s = {
              ...(cell.s || {}),
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      });
      
      // Thêm worksheet vào workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Thống kê');
      
      // Tạo tên file với timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `Thong_ke_so_sanh_thong_so_${timestamp}.xlsx`;
      
      // Xuất file
      XLSX.writeFile(workbook, fileName);
      
      this.snackBar.open(`Đã xuất thống kê ra file Excel`, 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      this.snackBar.open(`Lỗi khi xuất file: ${errorMessage}`, 'Đóng', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Tính toán thống kê cho một nhóm dữ liệu
   */
  private calculateStatistics(
    data: ExcelData[],
    congSuat: string,  // Có thể để trống nếu không dùng
    tbkt: string,
    mapping: ExportColumnMapping
  ): any {
    // Lấy các giá trị Po (cho Pk H1) - sử dụng mapping
    const poValues = data
      .map(row => this.parseNumber(row[mapping.po]))
      .filter(val => val !== null) as number[];
    
    // Lấy các giá trị Pk75H2 (cho Pk H2) - sử dụng mapping
    const pk75H2Values = mapping.pk75H2 ? data
      .map(row => this.parseNumber(row[mapping.pk75H2]))
      .filter(val => val !== null) as number[] : [];
    
    // Lấy các giá trị Uk75H1 (cho Uk H1) - sử dụng mapping
    const uk75H1Values = mapping.uk75H1 ? data
      .map(row => this.parseNumber(row[mapping.uk75H1]))
      .filter(val => val !== null) as number[] : [];
    
    // Lấy các giá trị Uk75H2 (cho Uk H2) - sử dụng mapping
    const uk75H2Values = mapping.uk75H2 ? data
      .map(row => this.parseNumber(row[mapping.uk75H2]))
      .filter(val => val !== null) as number[] : [];
    
    // Tính toán thống kê cho Po (Pk H1)
    const pkH1Max = poValues.length > 0 ? Math.max(...poValues) : null;
    const pkH1Min = poValues.length > 0 ? Math.min(...poValues) : null;
    const pkH1TB = poValues.length > 0 ? poValues.reduce((sum, val) => sum + val, 0) / poValues.length : null;
    const pkH1Delta = poValues.length > 0 ? this.calculateStandardDeviation(poValues) : null;
    
    // Tính toán thống kê cho Pk75H2 (Pk H2)
    const pkH2Max = pk75H2Values.length > 0 ? Math.max(...pk75H2Values) : null;
    const pkH2Min = pk75H2Values.length > 0 ? Math.min(...pk75H2Values) : null;
    const pkH2TB = pk75H2Values.length > 0 ? pk75H2Values.reduce((sum, val) => sum + val, 0) / pk75H2Values.length : null;
    const pkH2Delta = pk75H2Values.length > 0 ? this.calculateStandardDeviation(pk75H2Values) : null;
    
    // Tính toán thống kê cho Uk75H1 (Uk H1)
    const ukH1Max = uk75H1Values.length > 0 ? Math.max(...uk75H1Values) : null;
    const ukH1Min = uk75H1Values.length > 0 ? Math.min(...uk75H1Values) : null;
    const ukH1TB = uk75H1Values.length > 0 ? uk75H1Values.reduce((sum, val) => sum + val, 0) / uk75H1Values.length : null;
    const ukH1Delta = uk75H1Values.length > 0 ? this.calculateStandardDeviation(uk75H1Values) : null;
    
    // Tính toán thống kê cho Uk75H2 (Uk H2)
    const ukH2Max = uk75H2Values.length > 0 ? Math.max(...uk75H2Values) : null;
    const ukH2Min = uk75H2Values.length > 0 ? Math.min(...uk75H2Values) : null;
    const ukH2TB = uk75H2Values.length > 0 ? uk75H2Values.reduce((sum, val) => sum + val, 0) / uk75H2Values.length : null;
    const ukH2Delta = uk75H2Values.length > 0 ? this.calculateStandardDeviation(uk75H2Values) : null;
    
    return {
      congSuat,
      tbkt,
      soMau: poValues.length,
      pkH1Max,
      pkH1TB,
      pkH1Min,
      pkH1Delta,
      pkH2Max,
      pkH2TB,
      pkH2Min,
      pkH2Delta,
      ukH1Max,
      ukH1TB,
      ukH1Min,
      ukH1Delta,
      ukH2Max,
      ukH2TB,
      ukH2Min,
      ukH2Delta
    };
  }

  /**
   * Tính toán chênh lệch giữa hai nhóm thống kê
   */
  private calculateDifference(
    thuongStats: any,
    laeStats: any,
    congSuat: string,
    tbkt: string
  ): any {
    const calculateDiff = (val1: number | null, val2: number | null): number | null => {
      if (val1 === null || val2 === null) return null;
      return val2 - val1;
    };
    
    return {
      congSuat,
      tbkt,
      thongTin: 'Chênh lệch',
      soMau: '-',
      pkH1Max: calculateDiff(thuongStats.pkH1Max, laeStats.pkH1Max),
      pkH1TB: calculateDiff(thuongStats.pkH1TB, laeStats.pkH1TB),
      pkH1Min: calculateDiff(thuongStats.pkH1Min, laeStats.pkH1Min),
      pkH1Delta: calculateDiff(thuongStats.pkH1Delta, laeStats.pkH1Delta),
      pkH2Max: calculateDiff(thuongStats.pkH2Max, laeStats.pkH2Max),
      pkH2TB: calculateDiff(thuongStats.pkH2TB, laeStats.pkH2TB),
      pkH2Min: calculateDiff(thuongStats.pkH2Min, laeStats.pkH2Min),
      pkH2Delta: calculateDiff(thuongStats.pkH2Delta, laeStats.pkH2Delta),
      ukH1Max: calculateDiff(thuongStats.ukH1Max, laeStats.ukH1Max),
      ukH1TB: calculateDiff(thuongStats.ukH1TB, laeStats.ukH1TB),
      ukH1Min: calculateDiff(thuongStats.ukH1Min, laeStats.ukH1Min),
      ukH1Delta: calculateDiff(thuongStats.ukH1Delta, laeStats.ukH1Delta),
      ukH2Max: calculateDiff(thuongStats.ukH2Max, laeStats.ukH2Max),
      ukH2TB: calculateDiff(thuongStats.ukH2TB, laeStats.ukH2TB),
      ukH2Min: calculateDiff(thuongStats.ukH2Min, laeStats.ukH2Min),
      ukH2Delta: calculateDiff(thuongStats.ukH2Delta, laeStats.ukH2Delta)
    };
  }

  /**
   * Tạo dữ liệu worksheet với multi-level headers
   */
  private createWorksheetData(statisticsRows: any[]): any[][] {
    const worksheetData: any[][] = [];
    
    // Row 0: Title (merged across all columns)
    worksheetData.push(['thống kê so sánh thông số các thiết kế']);
    
    // Row 1: Parent headers
    worksheetData.push([
      'Công suất',
      'TBKT',
      'Số mẫu',
      'Pk H1', '', '', '',
      'Pk H2', '', '', '',
      'Uk H1', '', '', '',
      'Uk H2', '', '', ''
    ]);
    
    // Row 2: Sub headers
    worksheetData.push([
      '', '', '',
      'max', 'TB', 'min', 'δ',
      'max', 'TB', 'min', 'δ',
      'max', 'TB', 'min', 'δ',
      'max', 'TB', 'min', 'δ'
    ]);
    
    // Data rows
    statisticsRows.forEach(stats => {
      const formatValue = (val: number | null | string): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        // Làm tròn đến 2 chữ số thập phân, loại bỏ số 0 thừa
        const rounded = Math.round(val * 100) / 100;
        // Format với tối đa 2 chữ số thập phân
        return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(2);
      };
      
      worksheetData.push([
        stats.congSuat || '',
        stats.tbkt,
        stats.soMau,
        formatValue(stats.pkH1Max),
        formatValue(stats.pkH1TB),
        formatValue(stats.pkH1Min),
        formatValue(stats.pkH1Delta),
        formatValue(stats.pkH2Max),
        formatValue(stats.pkH2TB),
        formatValue(stats.pkH2Min),
        formatValue(stats.pkH2Delta),
        formatValue(stats.ukH1Max),
        formatValue(stats.ukH1TB),
        formatValue(stats.ukH1Min),
        formatValue(stats.ukH1Delta),
        formatValue(stats.ukH2Max),
        formatValue(stats.ukH2TB),
        formatValue(stats.ukH2Min),
        formatValue(stats.ukH2Delta)
      ]);
    });
    
    return worksheetData;
  }

}


