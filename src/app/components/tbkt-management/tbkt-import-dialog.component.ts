import { Component, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { AssignmentService } from '../../services/assignment.service';
import { TechnicalSheet } from '../../models/machine-assignment.model';

function excelDateToISO(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, day, month, year] = m;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function cellStr(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

/** Map Excel header (normalized) -> field key in TechnicalSheet */
const HEADER_MAP: Record<string, keyof TechnicalSheet | 'tbktCombined'> = {
  'tbkt': 'tbkt_ID',
  'số tbkt': 'tbkt_ID',
  'so tbkt': 'tbkt_ID',
  'số tbkt tự động': 'tbkt_ID',
  'so tbkt tu dong': 'tbkt_ID',
  'số tự động hiện lên': 'tbkt_ID',
  'so tu dong hien len': 'tbkt_ID',
  'số pha': 'phase',
  'so pha': 'phase',
  'công suất': 'power_kVA',
  'cong suat': 'power_kVA',
  'công suất mba kva': 'power_kVA',
  'cong suat mba kva': 'power_kVA',
  'công suất mba-kva': 'power_kVA',
  'cong suat mba-kva': 'power_kVA',
  'điện áp': 'voltageSpec',
  'dien ap': 'voltageSpec',
  'so (nếu có)': 'salesOrder',
  'so (neu co)': 'salesOrder',
  'tiêu chuẩn': 'standardCode',
  'tiêu chuẩn (nếu có)': 'standardCode',
  'tieu chuan': 'standardCode',
  'tieu chuan (neu co)': 'standardCode',
  'ngày giao': 'drawingDate',
  'ngay giao': 'drawingDate',
  'ghi chú': 'notes',
  'ghi chu': 'notes'
};

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, ' ').trim().toLowerCase();
}

@Component({
  selector: 'app-tbkt-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>upload</mat-icon>
      Import Đề Nghị TBKT Từ Excel
    </h2>
    <mat-dialog-content>
      <div class="import-container">
        <p class="hint">
          Chọn file Excel theo mẫu (các cột: TBKT, Số Pha, Công Suất, Điện Áp, SO, TIÊU CHUẨN, NGÀY GIAO, GHI CHÚ).
        </p>
        <input type="file" #fileInput accept=".xlsx,.xls" (change)="onFileSelected($event)" hidden>
        <button mat-stroked-button color="primary" (click)="triggerFileInput()" [disabled]="isImporting">
          <mat-icon>attach_file</mat-icon>
          Chọn file Excel
        </button>
        <div class="file-name" *ngIf="selectedFileName">
          File đã chọn: <strong>{{ selectedFileName }}</strong>
        </div>
        <ng-container *ngIf="sheetNames.length > 0">
          <mat-form-field appearance="outline">
            <mat-label>Chọn sheet</mat-label>
            <mat-select [(value)]="selectedSheetName" (selectionChange)="onSheetChange()">
              <mat-option *ngFor="let name of sheetNames" [value]="name">
                {{ name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
          <div class="file-name" *ngIf="previewCount > 0">
            Số dòng dữ liệu đọc được trong sheet: <strong>{{ previewCount }}</strong>
          </div>
        </ng-container>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="isImporting">
        <mat-icon>close</mat-icon>
        Hủy
      </button>
      <button mat-raised-button color="primary" (click)="import()" [disabled]="!canImport">
        <mat-icon *ngIf="!isImporting">cloud_upload</mat-icon>
        <mat-spinner *ngIf="isImporting" diameter="20" style="display:inline-block;margin-right:8px;"></mat-spinner>
        Import
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .import-container {
      padding: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .hint {
      margin: 0;
      color: #555;
      font-size: 14px;
    }
    .file-name {
      font-size: 13px;
      color: #333;
    }
  `]
})
export class TBKTImportDialogComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly dialogRef = inject(MatDialogRef<TBKTImportDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly assignmentService = inject(AssignmentService);

  selectedFile: File | null = null;
  workbook: XLSX.WorkBook | null = null;
  selectedSheetName = '';
  sheetNames: string[] = [];
  previewCount = 0;
  isImporting = false;
  selectedFileName: string | null = null;

  /** Xây TechnicalSheet list từ header + data rows (1 header row bất kỳ). */
  private buildSheetsFromData(headers: string[], dataRows: unknown[][]): TechnicalSheet[] {
    const result: TechnicalSheet[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const record: Record<string, unknown> = {};
      let ksDien = '';
      let ksCo = '';

      headers.forEach((h, colIndex) => {
        const key = HEADER_MAP[h];
        if (key) {
          record[key] = row[colIndex];
        }
        if (h === 'ks điện' || h === 'ks dien') {
          ksDien = cellStr(row[colIndex]);
        }
        if (h === 'ks cơ' || h === 'ks co') {
          ksCo = cellStr(row[colIndex]);
        }
      });

      const tbktId = cellStr(record['tbkt_ID']);
      const phase = cellStr(record['phase']);
      const power_kVA_raw = cellStr(record['power_kVA']);
      const voltageSpec = cellStr(record['voltageSpec']);
      const salesOrder = cellStr(record['salesOrder']);
      const standardCode = cellStr(record['standardCode']);
      const drawingDateIso = excelDateToISO(record['drawingDate']);
      const notes = cellStr(record['notes']);
      // Người đề nghị: ghép 2 cột KS Điện, KS Cơ, ngăn cách dấu phẩy
      const proposerText = [ksDien, ksCo].filter(v => v && v.trim().length > 0).join(', ');

      if (!tbktId) continue;

      const sheet: TechnicalSheet = {
        tbkt_ID: tbktId,
        phase: phase || undefined,
        power_kVA: power_kVA_raw ? Number(power_kVA_raw) : undefined,
        voltageSpec: voltageSpec || undefined,
        salesOrder: salesOrder || undefined,
        standardCode: standardCode || undefined,
        proposer: proposerText || undefined,
        drawingDate: drawingDateIso || undefined,
        notes: notes || undefined
      };
      result.push(sheet);
    }
    return result;
  }

  get canImport(): boolean {
    return !!this.selectedFile && !!this.workbook && !!this.selectedSheetName && this.previewCount > 0 && !this.isImporting;
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.snackBar.open('Vui lòng chọn file Excel (.xlsx hoặc .xls).', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.workbook = null;
    this.sheetNames = [];
    this.selectedSheetName = '';
    this.previewCount = 0;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: 'binary' });
        this.workbook = wb;
        this.sheetNames = wb.SheetNames;
        this.selectedSheetName = this.sheetNames[0] ?? '';
        this.updatePreviewCount();
      } catch {
        this.snackBar.open('Không đọc được file Excel.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    };
    reader.readAsBinaryString(file);
    input.value = '';
  }

  private updatePreviewCount(): void {
    if (!this.workbook || !this.selectedSheetName) {
      this.previewCount = 0;
      return;
    }
    const ws = this.workbook.Sheets[this.selectedSheetName];
    if (!ws) {
      this.previewCount = 0;
      return;
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
    this.previewCount = Math.max(0, rows.length - 1);
  }

  onSheetChange(): void {
    this.updatePreviewCount();
  }

  import(): void {
    if (!this.canImport || !this.workbook || !this.selectedSheetName) return;
    const ws = this.workbook.Sheets[this.selectedSheetName];
    if (!ws) return;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
    if (rows.length < 2) {
      this.snackBar.open('Sheet không có dữ liệu (cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu).', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    let headerRow = rows[0] as unknown[];
    let dataRows = rows.slice(1) as unknown[][];
    let headers = headerRow.map((h) => normalizeHeader(String(h ?? '')));

    let toCreate: TechnicalSheet[] = this.buildSheetsFromData(headers, dataRows);

    // Fallback: nếu không có dòng hợp lệ, thử coi dòng thứ 3 (index 2) là header,
    // data bắt đầu từ dòng thứ 4 (index 3) – khớp với file TBKT hiện tại.
    if (toCreate.length === 0 && rows.length >= 4) {
      headerRow = rows[2] as unknown[];
      dataRows = rows.slice(3) as unknown[][];
      headers = headerRow.map((h) => normalizeHeader(String(h ?? '')));
      toCreate = this.buildSheetsFromData(headers, dataRows);
    }

    if (toCreate.length === 0) {
      this.snackBar.open('Không có dòng dữ liệu hợp lệ để import.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Loại bỏ trùng TBKT trong file
    const seenInFile = new Set<string>();
    const deduped: TechnicalSheet[] = [];
    for (const row of toCreate) {
      const id = String(row.tbkt_ID || '').trim();
      if (!id || seenInFile.has(id)) continue;
      seenInFile.add(id);
      deduped.push(row);
    }
    const skippedInFile = toCreate.length - deduped.length;

    this.isImporting = true;
    // Lấy tất cả TBKT hiện có để kiểm tra trùng trước khi gọi create
    this.assignmentService.getAllTechnicalSheets(undefined).subscribe({
      next: (existing) => {
        const existingIds = new Set(
          (existing || []).map((s) => String(s.tbkt_ID || '').trim()).filter((id) => id.length > 0)
        );
        const toInsert = deduped.filter((row) => {
          const id = String(row.tbkt_ID || '').trim();
          return id && !existingIds.has(id);
        });
        const skippedExisting = deduped.length - toInsert.length;

        if (toInsert.length === 0) {
          this.isImporting = false;
          const parts: string[] = [];
          if (skippedInFile > 0) parts.push(`${skippedInFile} dòng trùng trong file`);
          if (skippedExisting > 0) parts.push(`${skippedExisting} dòng đã tồn tại trên hệ thống`);
          this.snackBar.open(
            'Không có bản ghi nào được thêm. ' + (parts.length ? parts.join(', ') + '.' : ''),
            'Đóng',
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            }
          );
          return;
        }

        let done = 0;
        let failed = 0;
        const total = toInsert.length;

        const next = (index: number) => {
          if (index >= total) {
            this.isImporting = false;
            const extra =
              (skippedInFile > 0 ? ` Bỏ qua ${skippedInFile} dòng trùng trong file.` : '') +
              (skippedExisting > 0 ? ` Bỏ qua ${skippedExisting} dòng trùng với dữ liệu hiện có.` : '');
            if (failed > 0) {
              this.snackBar.open(
                `Đã import ${done} bản ghi, thất bại ${failed} bản ghi.${extra}`,
                'Đóng',
                {
                  duration: 6000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['error-snackbar']
                }
              );
            } else {
              this.snackBar.open(`Đã import ${done} bản ghi.${extra}`, 'Đóng', {
                duration: 4000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['success-snackbar']
              });
            }
            this.dialogRef.close(true);
            return;
          }

          const payload: Partial<TechnicalSheet> = {
            tbkt_ID: toInsert[index].tbkt_ID,
            phase: toInsert[index].phase,
            power_kVA: toInsert[index].power_kVA,
            voltageSpec: toInsert[index].voltageSpec,
            salesOrder: toInsert[index].salesOrder,
            standardCode: toInsert[index].standardCode,
            proposer: toInsert[index].proposer ?? undefined,
            drawingDate: toInsert[index].drawingDate,
            notes: toInsert[index].notes
          };

          this.assignmentService.createTechnicalSheet(payload).subscribe({
            next: () => {
              done++;
              next(index + 1);
            },
            error: () => {
              failed++;
              next(index + 1);
            }
          });
        };

        next(0);
      },
      error: () => {
        this.isImporting = false;
        this.snackBar.open('Không thể tải danh sách TBKT hiện có để kiểm tra trùng.', 'Đóng', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}


