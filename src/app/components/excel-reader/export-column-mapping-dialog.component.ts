import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

export interface ExportColumnMapping {
  congSuat: string;      // Cột Công suất
  tbkt: string;          // Cột TBKT
  po: string;            // Cột Po (cho Pk H1)
  pk75H2: string;        // Cột Pk75H2 (cho Pk H2)
  uk75H1: string;        // Cột Uk75H1 (cho Uk H1)
  uk75H2: string;        // Cột Uk75H2 (cho Uk H2)
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
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Mapping cột dữ liệu</h2>
    <mat-dialog-content>
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
    .dialog-content {
      min-width: 500px;
      max-width: 700px;
      max-height: 600px;
      display: flex;
      flex-direction: column;
    }

    .description {
      margin-bottom: 20px;
      color: #666;
      font-size: 14px;
    }

    .mapping-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 450px;
      overflow-y: auto;
      padding-right: 8px;
    }

    .mapping-item {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .mapping-label {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 180px;
      font-weight: 500;
      color: #333;
    }

    .mapping-label mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #1976d2;
    }

    .mapping-field {
      flex: 1;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
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
        uk75H2: this.findColumnByPattern(['uk75h2', 'uk75_h2', 'uk75 (%)_h2'])
      };
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
    return !!(this.mapping.tbkt && this.mapping.po);
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

