import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

export interface ColumnSelectionData {
  columns: string[];
  selectedColumns: string[];
}

@Component({
  selector: 'app-column-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>Chọn các cột dữ liệu</h2>
    <mat-dialog-content>
      <div class="dialog-content">
        <div class="search-section">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Tìm kiếm cột</mat-label>
            <input 
              matInput 
              [(ngModel)]="searchTerm"
              (input)="filterColumns()"
              placeholder="Nhập tên cột...">
            <mat-icon matPrefix>search</mat-icon>
            <button 
              *ngIf="searchTerm"
              mat-icon-button 
              matSuffix 
              (click)="clearSearch()"
              [attr.aria-label]="'Xóa tìm kiếm'">
              <mat-icon>clear</mat-icon>
            </button>
          </mat-form-field>
        </div>

        <div class="action-buttons">
          <button mat-button (click)="selectAll()" type="button">
            <mat-icon>check_box</mat-icon>
            Chọn tất cả
          </button>
          <button mat-button (click)="deselectAll()" type="button">
            <mat-icon>check_box_outline_blank</mat-icon>
            Bỏ chọn tất cả
          </button>
        </div>

        <mat-divider></mat-divider>

        <div class="columns-list">
          <div 
            *ngFor="let column of filteredColumns" 
            class="column-item">
            <mat-checkbox
              [(ngModel)]="selectedColumnsMap[column]"
              (change)="updateSelectedColumns()">
              {{ column }}
            </mat-checkbox>
          </div>
        </div>

        <div *ngIf="filteredColumns.length === 0" class="no-results">
          <mat-icon>search_off</mat-icon>
          <p>Không tìm thấy cột nào</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" type="button">Hủy</button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="onConfirm()" 
        [disabled]="selectedColumns.length === 0"
        type="button">
        Xác nhận ({{ selectedColumns.length }} cột)
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      min-width: 400px;
      max-width: 600px;
      max-height: 500px;
      display: flex;
      flex-direction: column;
    }

    .search-section {
      margin-bottom: 16px;
    }

    .search-field {
      width: 100%;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .action-buttons button {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .columns-list {
      max-height: 300px;
      overflow-y: auto;
      margin-top: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 8px;
    }

    .column-item {
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .column-item:last-child {
      border-bottom: none;
    }

    .no-results {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .no-results mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class ColumnSelectionDialogComponent {
  searchTerm: string = '';
  filteredColumns: string[] = [];
  selectedColumnsMap: { [key: string]: boolean } = {};
  selectedColumns: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<ColumnSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ColumnSelectionData
  ) {
    // Khởi tạo selectedColumnsMap từ data.selectedColumns
    this.data.columns.forEach(col => {
      this.selectedColumnsMap[col] = this.data.selectedColumns.includes(col);
    });
    
    // Khởi tạo selectedColumns
    this.updateSelectedColumns();
    
    // Khởi tạo filteredColumns
    this.filteredColumns = [...this.data.columns];
  }

  filterColumns() {
    if (!this.searchTerm.trim()) {
      this.filteredColumns = [...this.data.columns];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();
    this.filteredColumns = this.data.columns.filter(col =>
      col.toLowerCase().includes(searchLower)
    );
  }

  clearSearch() {
    this.searchTerm = '';
    this.filterColumns();
  }

  selectAll() {
    this.filteredColumns.forEach(col => {
      this.selectedColumnsMap[col] = true;
    });
    this.updateSelectedColumns();
  }

  deselectAll() {
    this.filteredColumns.forEach(col => {
      this.selectedColumnsMap[col] = false;
    });
    this.updateSelectedColumns();
  }

  updateSelectedColumns() {
    this.selectedColumns = this.data.columns.filter(
      col => this.selectedColumnsMap[col]
    );
  }

  onConfirm() {
    if (this.selectedColumns.length === 0) {
      return;
    }
    this.dialogRef.close(this.selectedColumns);
  }

  onCancel() {
    this.dialogRef.close();
  }
}

