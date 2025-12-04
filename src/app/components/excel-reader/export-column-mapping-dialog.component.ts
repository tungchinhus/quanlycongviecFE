import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface ExportColumnMapping {
  congSuat: string;      // Cột Công suất
  tbkt: string;          // Cột TBKT
  po: string;            // Cột Po (cho Pk H1)
  pk75H2: string;        // Cột Pk75H2 (cho Pk H2)
  uk75H1: string;        // Cột Uk75H1 (cho Uk H1)
  uk75H2: string;        // Cột Uk75H2 (cho Uk H2)
  showChart: boolean;    // Hiển thị line chart
  xAxisColumn: string;   // Cột cho trục X
  yAxisColumn: string;   // Cột cho trục Y
}

export interface ExportColumnMappingData {
  availableColumns: string[];
  columnLabels: { [key: string]: string };
  currentMapping?: ExportColumnMapping;
}

@Component({
  selector: 'app-export-column-mapping-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>Mapping cột dữ liệu</h2>
    <mat-dialog-content class="dialog-content-wrapper">
      <div class="dialog-content">
        <p class="description">
          Chọn các cột từ dữ liệu hiện tại để mapping với các cột trong file Excel thống kê:
        </p>
        
        <div class="mapping-section">
          <div class="mapping-item">
            <label class="mapping-label">
              <mat-icon>label</mat-icon>
              <span>Công suất:</span>
            </label>
            <mat-form-field appearance="outline" class="mapping-field">
              <mat-select [(ngModel)]="mapping.congSuat" name="congSuat">
                <mat-option value="">-- Chọn cột --</mat-option>
                <mat-option *ngFor="let col of availableColumns" [value]="col">
                  {{ getColumnLabel(col) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="mapping-item">
            <label class="mapping-label">
              <mat-icon>label</mat-icon>
              <span>TBKT:</span>
            </label>
            <mat-form-field appearance="outline" class="mapping-field">
              <mat-select [(ngModel)]="mapping.tbkt" name="tbkt">
                <mat-option value="">-- Chọn cột --</mat-option>
                <mat-option *ngFor="let col of availableColumns" [value]="col">
                  {{ getColumnLabel(col) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="mapping-item">
            <label class="mapping-label">
              <mat-icon>label</mat-icon>
              <span>Pk75H1 (cho Pk H1):</span>
            </label>
            <mat-form-field appearance="outline" class="mapping-field">
              <mat-select [(ngModel)]="mapping.po" name="po">
                <mat-option value="">-- Chọn cột --</mat-option>
                <mat-option *ngFor="let col of availableColumns" [value]="col">
                  {{ getColumnLabel(col) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="mapping-item">
            <label class="mapping-label">
              <mat-icon>label</mat-icon>
              <span>Pk75H2 (cho Pk H2):</span>
            </label>
            <mat-form-field appearance="outline" class="mapping-field">
              <mat-select [(ngModel)]="mapping.pk75H2" name="pk75H2">
                <mat-option value="">-- Chọn cột --</mat-option>
                <mat-option *ngFor="let col of availableColumns" [value]="col">
                  {{ getColumnLabel(col) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="mapping-item">
            <label class="mapping-label">
              <mat-icon>label</mat-icon>
              <span>Uk75H1 (cho Uk H1):</span>
            </label>
            <mat-form-field appearance="outline" class="mapping-field">
              <mat-select [(ngModel)]="mapping.uk75H1" name="uk75H1">
                <mat-option value="">-- Chọn cột --</mat-option>
                <mat-option *ngFor="let col of availableColumns" [value]="col">
                  {{ getColumnLabel(col) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="mapping-item">
            <label class="mapping-label">
              <mat-icon>label</mat-icon>
              <span>Uk75H2 (cho Uk H2):</span>
            </label>
            <mat-form-field appearance="outline" class="mapping-field">
              <mat-select [(ngModel)]="mapping.uk75H2" name="uk75H2">
                <mat-option value="">-- Chọn cột --</mat-option>
                <mat-option *ngFor="let col of availableColumns" [value]="col">
                  {{ getColumnLabel(col) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="chart-section">
            <div class="chart-checkbox">
              <mat-checkbox [(ngModel)]="mapping.showChart" name="showChart">
                Hiển thị line chart
              </mat-checkbox>
            </div>
            
            <div *ngIf="mapping.showChart" class="chart-options">
              <div class="mapping-item">
                <label class="mapping-label">
                  <mat-icon>label</mat-icon>
                  <span>Trục X:</span>
                </label>
                <mat-form-field appearance="outline" class="mapping-field">
                  <mat-select [(ngModel)]="mapping.xAxisColumn" name="xAxisColumn">
                    <mat-option value="">-- Chọn cột --</mat-option>
                    <mat-option *ngFor="let col of availableColumns" [value]="col">
                      {{ getColumnLabel(col) }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="mapping-item">
                <label class="mapping-label">
                  <mat-icon>label</mat-icon>
                  <span>Trục Y:</span>
                </label>
                <mat-form-field appearance="outline" class="mapping-field">
                  <mat-select [(ngModel)]="mapping.yAxisColumn" name="yAxisColumn">
                    <mat-option value="">-- Chọn cột --</mat-option>
                    <mat-option *ngFor="let col of availableColumns" [value]="col">
                      {{ getColumnLabel(col) }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>
          </div>

        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" type="button">Hủy</button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="onConfirm()" 
        [disabled]="!isValid()"
        type="button">
        Xác nhận
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-content {
      max-height: none !important;
      overflow: visible !important;
    }

    .dialog-content-wrapper {
      padding: 0 24px;
    }

    .dialog-content {
      min-width: 500px;
      max-width: 700px;
      display: flex;
      flex-direction: column;
    }

    .description {
      margin-bottom: 16px;
      color: #666;
      font-size: 14px;
    }

    .mapping-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-right: 0;
    }

    .mapping-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mapping-label {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 160px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .mapping-label mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #1976d2;
    }

    .mapping-field {
      flex: 1;
    }

    .chart-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .chart-checkbox {
      margin-bottom: 12px;
    }

    .chart-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-left: 24px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      margin-top: 8px;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      padding-bottom: 0;
    }

    ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      margin-top: 0;
    }
  `]
})
export class ExportColumnMappingDialogComponent {
  mapping: ExportColumnMapping;
  availableColumns: string[];
  columnLabels: { [key: string]: string };

  constructor(
    public dialogRef: MatDialogRef<ExportColumnMappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExportColumnMappingData
  ) {
    this.availableColumns = data.availableColumns || [];
    this.columnLabels = data.columnLabels || {};
    
    // Khởi tạo mapping từ currentMapping hoặc mặc định
    if (data.currentMapping) {
      this.mapping = { ...data.currentMapping };
    } else {
      // Tự động detect các cột phù hợp
      this.mapping = {
        congSuat: this.findColumnByPattern(['congsuat', 'công suất', 'cong suat', 'kva']),
        tbkt: this.findColumnByPattern(['tbkt', 'tbkt_lsx']),
        po: this.findColumnByPattern(['po', 'po_(w)', 'po (w)']),
        pk75H2: this.findColumnByPattern(['pk75h2', 'pk75_h2', 'pk75 (w)_h2']),
        uk75H1: this.findColumnByPattern(['uk75h1', 'uk75_h1', 'uk75 (%)_h1']),
        uk75H2: this.findColumnByPattern(['uk75h2', 'uk75_h2', 'uk75 (%)_h2']),
        showChart: false,
        xAxisColumn: '',
        yAxisColumn: ''
      };
    }
    
    // Đảm bảo các trường chart luôn có giá trị mặc định
    if (this.mapping.showChart === undefined) {
      this.mapping.showChart = false;
    }
    if (!this.mapping.xAxisColumn) {
      // Tự động detect cột X-axis (ưu tiên TBKT)
      this.mapping.xAxisColumn = this.findColumnByPattern(['tbkt', 'tbkt_lsx']) || '';
    }
    if (!this.mapping.yAxisColumn) {
      // Tự động detect cột Y-axis (ưu tiên Số mẫu hoặc các cột số)
      this.mapping.yAxisColumn = this.findColumnByPattern(['số mẫu', 'so mau', 'sample', 'count']) || '';
    }
  }

  findColumnByPattern(patterns: string[]): string {
    for (const pattern of patterns) {
      const found = this.availableColumns.find(col => {
        const colLower = col.toLowerCase().trim();
        return colLower.includes(pattern.toLowerCase());
      });
      if (found) return found;
    }
    return '';
  }

  getColumnLabel(column: string): string {
    return this.columnLabels[column] || column;
  }

  isValid(): boolean {
    // Các cột bắt buộc: tbkt, po (không cần congSuat nữa)
    const basicValid = !!(this.mapping.tbkt && this.mapping.po);
    
    // Nếu bật chart, cần chọn cả X và Y axis
    if (this.mapping.showChart) {
      return basicValid && !!(this.mapping.xAxisColumn && this.mapping.yAxisColumn);
    }
    
    return basicValid;
  }

  onConfirm() {
    if (!this.isValid()) {
      return;
    }
    this.dialogRef.close(this.mapping);
  }

  onCancel() {
    this.dialogRef.close();
  }
}

