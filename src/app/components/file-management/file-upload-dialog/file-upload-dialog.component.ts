import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FileService } from '../../../services/file.service';
import { SettingsService } from '../../../services/settings.service';

@Component({
  selector: 'app-file-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './file-upload-dialog.component.html',
  styleUrls: ['./file-upload-dialog.component.css']
})
export class FileUploadDialogComponent implements OnInit {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  readonly currentStoragePath = signal<string>('');
  readonly isLoadingPath = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<FileUploadDialogComponent>,
    private fileService: FileService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar
  ) {
    this.uploadForm = this.fb.group({
      description: ['']
    });
  }

  ngOnInit() {
    this.loadStoragePath();
  }

  loadStoragePath() {
    this.isLoadingPath.set(true);
    this.settingsService.getFileStoragePath().subscribe({
      next: (response) => {
        this.isLoadingPath.set(false);
        this.currentStoragePath.set(response.fileStoragePath || '');
      },
      error: (error) => {
        this.isLoadingPath.set(false);
        console.error('Error loading storage path:', error);
        // Không hiển thị lỗi nếu không có quyền truy cập settings (user thường)
        // Chỉ log để debug
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUpload() {
    if (!this.selectedFile) {
      return;
    }

    // Kiểm tra xem có đường dẫn lưu file chưa
    if (!this.currentStoragePath() || this.currentStoragePath().trim() === '') {
      this.snackBar.open(
        'Chưa cấu hình đường dẫn lưu file. Vui lòng liên hệ Administrator để thiết lập trong phần Cài đặt.',
        'Đóng',
        {
          duration: 6000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        }
      );
      return;
    }

    this.isUploading.set(true);
    const description = this.uploadForm.get('description')?.value;
    
    this.fileService.uploadFile(this.selectedFile, description).subscribe({
      next: (result) => {
        this.isUploading.set(false);
        this.snackBar.open('Upload file thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Error uploading file:', err);
        const errorMessage = err.error?.message || 'Lỗi khi upload file. Vui lòng thử lại.';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

