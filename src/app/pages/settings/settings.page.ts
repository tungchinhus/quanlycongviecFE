import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css'
})
export class SettingsPage implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.authService.hasRole(UserRole.Administrator));
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isValidating = signal<boolean>(false);

  settingsForm!: FormGroup;

  ngOnInit() {
    this.initForm();
    this.loadSettings();
  }

  initForm() {
    this.settingsForm = this.fb.group({
      fileStoragePath: ['', [Validators.required, Validators.minLength(1)]],
      signatureStoragePath: ['', [Validators.required, Validators.minLength(1)]],
      sendEmailNotifications: [true],
      designerWarningDays: [2, [Validators.required, Validators.min(0), Validators.max(30)]],
      reviewerWarningDays: [1, [Validators.required, Validators.min(0), Validators.max(30)]]
    });
  }

  loadSettings() {
    if (!this.isAdmin()) {
      return;
    }

    this.isLoading.set(true);
    this.settingsService.getAllSystemSettings().subscribe({
      next: (settings) => {
        this.isLoading.set(false);
        this.settingsForm.patchValue({
          fileStoragePath: settings.fileStoragePath || '',
          signatureStoragePath: settings.signatureStoragePath || '',
          sendEmailNotifications: settings.sendEmailNotifications !== false, // Default to true
          designerWarningDays: settings.designerWarningDays ?? 2,
          reviewerWarningDays: settings.reviewerWarningDays ?? 1
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading settings:', error);
        this.snackBar.open('Không thể tải cài đặt. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  validatePath(fieldName: 'fileStoragePath' | 'signatureStoragePath' = 'fileStoragePath') {
    const path = this.settingsForm.get(fieldName)?.value;
    if (!path || path.trim() === '') {
      this.snackBar.open('Vui lòng nhập đường dẫn trước khi kiểm tra.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      return;
    }

    this.isValidating.set(true);
    this.settingsService.validatePath(path).subscribe({
      next: (response) => {
        this.isValidating.set(false);
        if (response.valid) {
          this.snackBar.open('Đường dẫn hợp lệ!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        } else {
          this.snackBar.open(response.message || 'Đường dẫn không hợp lệ.', 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (error) => {
        this.isValidating.set(false);
        console.error('Error validating path:', error);
        this.snackBar.open('Không thể kiểm tra đường dẫn. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  saveSettings() {
    if (!this.isAdmin()) {
      return;
    }

    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      this.snackBar.open('Vui lòng điền đầy đủ thông tin.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const fileStoragePath = this.settingsForm.get('fileStoragePath')?.value?.trim();
    if (!fileStoragePath) {
      this.snackBar.open('Vui lòng nhập đường dẫn lưu file.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const signatureStoragePath = this.settingsForm.get('signatureStoragePath')?.value?.trim();
    if (!signatureStoragePath) {
      this.snackBar.open('Vui lòng nhập đường dẫn lưu chữ ký.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const sendEmailNotifications = this.settingsForm.get('sendEmailNotifications')?.value ?? true;
    const designerWarningDays = this.settingsForm.get('designerWarningDays')?.value ?? 2;
    const reviewerWarningDays = this.settingsForm.get('reviewerWarningDays')?.value ?? 1;

    this.isSaving.set(true);
    
    // Save all settings
    const saveFileStorage = this.settingsService.updateFileStoragePath(fileStoragePath);
    const saveSignatureStorage = this.settingsService.updateSignatureStoragePath(signatureStoragePath);
    const saveNotification = this.settingsService.updateNotificationPreference(sendEmailNotifications);
    const saveWarningDays = this.settingsService.updateWarningDays(designerWarningDays, reviewerWarningDays);

    // Execute all saves
    saveFileStorage.subscribe({
      next: () => {
        saveSignatureStorage.subscribe({
          next: () => {
            saveNotification.subscribe({
              next: () => {
                saveWarningDays.subscribe({
                  next: () => {
                    this.isSaving.set(false);
                    this.snackBar.open('Cài đặt đã được lưu thành công!', 'Đóng', {
                      duration: 3000,
                      horizontalPosition: 'center',
                      verticalPosition: 'top',
                      panelClass: ['success-snackbar']
                    });
                  },
                  error: (error) => {
                    this.isSaving.set(false);
                    console.error('Error saving warning days:', error);
                    this.snackBar.open('Đã lưu đường dẫn và thông báo nhưng không thể lưu cài đặt cảnh báo.', 'Đóng', {
                      duration: 5000,
                      horizontalPosition: 'center',
                      verticalPosition: 'top',
                      panelClass: ['error-snackbar']
                    });
                  }
                });
              },
              error: (error) => {
                this.isSaving.set(false);
                console.error('Error saving notification preference:', error);
                this.snackBar.open('Đã lưu đường dẫn nhưng không thể lưu cài đặt thông báo.', 'Đóng', {
                  duration: 5000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['error-snackbar']
                });
              }
            });
          },
          error: (error) => {
            this.isSaving.set(false);
            console.error('Error saving signature storage path:', error);
            this.snackBar.open('Đã lưu đường dẫn file nhưng không thể lưu đường dẫn chữ ký.', 'Đóng', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            });
          }
        });
      },
      error: (error) => {
        this.isSaving.set(false);
        console.error('Error saving settings:', error);
        const errorMessage = error.error?.message || 'Không thể lưu cài đặt. Vui lòng thử lại.';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  resetForm() {
    this.loadSettings();
  }
}

