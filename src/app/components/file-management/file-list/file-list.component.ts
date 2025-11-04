import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FileService } from '../../../services/file.service';
import { FileDocument, FileStatus } from '../../../models/file.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.css']
})
export class FileListComponent implements OnInit {
  files: FileDocument[] = [];
  filteredFiles: FileDocument[] = [];
  displayedColumns: string[] = ['fileName', 'fileType', 'fileSize', 'status', 'uploadDate', 'actions'];
  selectedStatus: FileStatus | null = null;
  statusOptions = Object.values(FileStatus);

  constructor(
    private fileService: FileService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadFiles();
  }

  loadFiles() {
    this.fileService.getAllFiles().subscribe({
      next: (files) => {
        this.files = files;
        this.applyFilter();
      },
      error: (err) => {
        console.error('Error loading files:', err);
        // Mock data for development
        this.files = [];
        this.applyFilter();
      }
    });
  }

  applyFilter(event?: Event) {
    let filterValue = '';
    if (event) {
      filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    }

    this.filteredFiles = this.files.filter(file => {
      const matchesSearch = !filterValue || 
        file.fileName.toLowerCase().includes(filterValue) ||
        (file.description && file.description.toLowerCase().includes(filterValue));
      
      const matchesStatus = !this.selectedStatus || file.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  openUploadDialog() {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadFiles();
      }
    });
  }

  downloadFile(file: FileDocument) {
    this.fileService.downloadFile(file.fileID).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error downloading file:', err)
    });
  }

  deleteFile(file: FileDocument) {
    if (confirm(`Bạn có chắc muốn xóa file "${file.fileName}"?`)) {
      this.fileService.deleteFile(file.fileID).subscribe({
        next: () => this.loadFiles(),
        error: (err) => console.error('Error deleting file:', err)
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusClass(status?: FileStatus): string {
    if (!status) return '';
    return `status-${status.toLowerCase()}`;
  }
}

