import { Component, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { SignatureService } from '../../services/signature.service';
import { SignaturePadComponent } from '../../components/signature-pad/signature-pad.component';

@Component({
  selector: 'app-personal-info-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    SignaturePadComponent
  ],
  templateUrl: './personal-info.page.html',
  styleUrl: './personal-info.page.css'
})
export class PersonalInfoPage implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly signatureService = inject(SignatureService);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild(SignaturePadComponent) signaturePad!: SignaturePadComponent;

  readonly isLoading = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);
  readonly hasSignature = signal<boolean>(false);
  readonly signatureUrl = signal<string | null>(null);
  readonly showSignaturePad = signal<boolean>(false);
  readonly imageLoadError = signal<boolean>(false);
  readonly signatureMode = signal<'draw' | 'upload'>('draw');
  readonly uploadedFilePreview = signal<string | null>(null);
  readonly uploadedFile = signal<File | null>(null);

  readonly user = this.authService.user;

  ngOnInit() {
    this.loadSignatureInfo();
  }

  loadSignatureInfo() {
    this.isLoading.set(true);
    this.imageLoadError.set(false);
    this.signatureService.getSignatureInfo().subscribe({
      next: (info) => {
        this.isLoading.set(false);
        this.hasSignature.set(info.hasSignature);
        if (info.hasSignature) {
          // Load signature as blob to ensure proper authentication
          this.loadSignatureAsBlob();
        } else {
          this.signatureUrl.set(null);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading signature info:', error);
        // Không hiển thị lỗi nếu chưa có chữ ký
        if (error.status !== 404) {
          this.snackBar.open('Không thể tải thông tin chữ ký.', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        }
      }
    });
  }

  loadSignatureAsBlob() {
    this.signatureService.getSignature().subscribe({
      next: (blob) => {
        // Create blob URL from the blob
        const blobUrl = URL.createObjectURL(blob);
        // Revoke old URL if exists
        if (this.signatureUrl()) {
          URL.revokeObjectURL(this.signatureUrl()!);
        }
        this.signatureUrl.set(blobUrl);
        this.imageLoadError.set(false);
      },
      error: (error) => {
        console.error('Error loading signature blob:', error);
        this.imageLoadError.set(true);
        this.hasSignature.set(false);
        this.signatureUrl.set(null);
        if (error.status !== 404) {
          this.snackBar.open('Không thể tải chữ ký. Vui lòng thử lại.', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      }
    });
  }

  onImageError() {
    console.error('Error loading signature image');
    this.imageLoadError.set(true);
    this.hasSignature.set(false);
    // Try to reload
    this.loadSignatureInfo();
  }

  showSignatureEditor() {
    this.showSignaturePad.set(true);
    this.signatureMode.set('draw');
    this.uploadedFilePreview.set(null);
    this.uploadedFile.set(null);
  }

  hideSignatureEditor() {
    this.showSignaturePad.set(false);
    this.signatureMode.set('draw');
    this.uploadedFilePreview.set(null);
    this.uploadedFile.set(null);
  }

  setSignatureMode(mode: 'draw' | 'upload') {
    this.signatureMode.set(mode);
    if (mode === 'upload') {
      this.uploadedFilePreview.set(null);
      this.uploadedFile.set(null);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Chỉ chấp nhận file hình ảnh (PNG, JPG, GIF, BMP, WEBP).', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        input.value = '';
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.snackBar.open('Kích thước file không được vượt quá 5MB.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        input.value = '';
        return;
      }

      this.uploadedFile.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedFilePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadFileAsSignature() {
    const file = this.uploadedFile();
    if (!file) {
      this.snackBar.open('Vui lòng chọn file hình ảnh.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Upload file directly
    this.isUploading.set(true);
    this.signatureService.uploadSignature(file).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.showSignaturePad.set(false);
        this.snackBar.open('Lưu chữ ký thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        // Reload signature info
        this.loadSignatureInfo();
        // Reset upload state
        this.uploadedFilePreview.set(null);
        this.uploadedFile.set(null);
      },
      error: (error) => {
        this.isUploading.set(false);
        console.error('Error uploading signature:', error);
        const errorMessage = error.error?.error || error.message || 'Lưu chữ ký thất bại. Vui lòng thử lại.';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onSignatureSaved(blob: Blob) {
    this.uploadSignature(blob);
  }

  async uploadSignature(blob: Blob, fileName?: string, fileType?: string) {
    try {
      this.isUploading.set(true);

      // Convert blob to File
      const file = new File([blob], fileName || 'signature.png', { type: fileType || 'image/png' });

      this.signatureService.uploadSignature(file).subscribe({
        next: () => {
          this.isUploading.set(false);
          this.showSignaturePad.set(false);
          this.snackBar.open('Lưu chữ ký thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          // Reload signature info
          this.loadSignatureInfo();
          // Reset upload state
          this.uploadedFilePreview.set(null);
          this.uploadedFile.set(null);
        },
        error: (error) => {
          this.isUploading.set(false);
          console.error('Error uploading signature:', error);
          const errorMessage = error.error?.error || error.message || 'Lưu chữ ký thất bại. Vui lòng thử lại.';
          this.snackBar.open(errorMessage, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } catch (error) {
      this.isUploading.set(false);
      console.error('Error converting signature:', error);
      this.snackBar.open('Lỗi khi xử lý chữ ký. Vui lòng thử lại.', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  async saveSignature() {
    try {
      // Check mode
      if (this.signatureMode() === 'upload') {
        await this.uploadFileAsSignature();
        return;
      }

      // Draw mode
      if (!this.signaturePad) {
        this.snackBar.open('Vui lòng vẽ chữ ký trước khi lưu.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }

      const blob = await this.signaturePad.getSignatureBlob();
      if (blob) {
        this.uploadSignature(blob);
      } else {
        this.snackBar.open('Vui lòng vẽ chữ ký trước khi lưu.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    } catch (error: any) {
      this.snackBar.open(error.message || 'Lỗi khi lưu chữ ký.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  deleteSignature() {
    if (!confirm('Bạn có chắc chắn muốn xóa chữ ký điện tử?')) {
      return;
    }

    this.isLoading.set(true);
    this.signatureService.deleteSignature().subscribe({
      next: () => {
        this.isLoading.set(false);
        // Revoke blob URL if exists
        if (this.signatureUrl()) {
          URL.revokeObjectURL(this.signatureUrl()!);
        }
        this.hasSignature.set(false);
        this.signatureUrl.set(null);
        this.snackBar.open('Xóa chữ ký thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error deleting signature:', error);
        const errorMessage = error.error?.error || error.message || 'Xóa chữ ký thất bại. Vui lòng thử lại.';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  ngOnDestroy() {
    // Clean up blob URL to prevent memory leaks
    if (this.signatureUrl()) {
      URL.revokeObjectURL(this.signatureUrl()!);
    }
  }
}
