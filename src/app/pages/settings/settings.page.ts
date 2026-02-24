import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
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
import { TraCuuFilesService, IndexStatus } from '../../services/tra-cuu-files.service';
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
export class SettingsPage implements OnInit, OnDestroy {
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(AuthService);
  private readonly traCuuFilesService = inject(TraCuuFilesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.authService.hasRole(UserRole.Administrator));
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isValidating = signal<boolean>(false);
  readonly isTriggeringIndex = signal<boolean>(false);
  /** Trạng thái indexer từ Python service (GET /index/status). */
  readonly indexStatus = signal<IndexStatus | null>(null);
  private indexStatusPollTimer: ReturnType<typeof setInterval> | null = null;

  settingsForm!: FormGroup;

  ngOnInit() {
    this.initForm();
    this.loadSettings();
    this.loadIndexStatus();
  }

  ngOnDestroy() {
    this.stopIndexStatusPolling();
  }

  initForm() {
    this.settingsForm = this.fb.group({
      fileStoragePath: ['', [Validators.required, Validators.minLength(1)]],
      signatureStoragePath: ['', [Validators.required, Validators.minLength(1)]],
      indexRoots: [''],
      sendEmailNotifications: [true],
      designerWarningDays: [2, [Validators.required, Validators.min(0), Validators.max(30)]],
      reviewerWarningDays: [1, [Validators.required, Validators.min(0), Validators.max(30)]],
      syncIntervalMinutes: [2, [Validators.required, Validators.min(1), Validators.max(1440)]],
      indexerScheduledTime: ['']
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
          indexRoots: settings.indexRoots ?? '',
          sendEmailNotifications: settings.sendEmailNotifications !== false, // Default to true
          designerWarningDays: settings.designerWarningDays ?? 2,
          reviewerWarningDays: settings.reviewerWarningDays ?? 1,
          syncIntervalMinutes: settings.syncIntervalMinutes ?? 2,
          indexerScheduledTime: settings.indexerScheduledTime ?? ''
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

  validatePath(fieldName: 'fileStoragePath' | 'signatureStoragePath' | 'indexRoots' = 'fileStoragePath') {
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

  validateAllPaths() {
    const fields: Array<'fileStoragePath' | 'signatureStoragePath' | 'indexRoots'> = ['fileStoragePath', 'signatureStoragePath', 'indexRoots'];
    const toCheck = fields
      .map(f => ({ field: f, path: this.settingsForm.get(f)?.value?.trim() }))
      .filter(x => x.path);
    if (toCheck.length === 0) {
      this.snackBar.open('Vui lòng nhập ít nhất một đường dẫn để kiểm tra.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      return;
    }
    this.isValidating.set(true);
    let done = 0;
    let hasError = false;
    const onNext = () => {
      done++;
      if (done === toCheck.length) {
        this.isValidating.set(false);
        this.snackBar.open(hasError ? 'Một số đường dẫn không hợp lệ.' : 'Tất cả đường dẫn hợp lệ.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: hasError ? ['error-snackbar'] : ['success-snackbar']
        });
      }
    };
    toCheck.forEach(({ field, path }, i) => {
      this.settingsService.validatePath(path!).subscribe({
        next: (response) => {
          if (!response.valid) hasError = true;
          onNext();
        },
        error: () => {
          hasError = true;
          onNext();
        }
      });
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

    const indexRoots = this.settingsForm.get('indexRoots')?.value?.trim() ?? '';
    const sendEmailNotifications = this.settingsForm.get('sendEmailNotifications')?.value ?? true;
    const designerWarningDays = this.settingsForm.get('designerWarningDays')?.value ?? 2;
    const reviewerWarningDays = this.settingsForm.get('reviewerWarningDays')?.value ?? 1;
    const syncIntervalMinutes = this.settingsForm.get('syncIntervalMinutes')?.value ?? 2;
    const indexerScheduledTime = (this.settingsForm.get('indexerScheduledTime')?.value ?? '').trim();

    this.isSaving.set(true);
    
    // Save all settings
    const saveFileStorage = this.settingsService.updateFileStoragePath(fileStoragePath);
    const saveSignatureStorage = this.settingsService.updateSignatureStoragePath(signatureStoragePath);
    const saveIndexRoots = this.settingsService.updateIndexRoots(indexRoots);
    const saveNotification = this.settingsService.updateNotificationPreference(sendEmailNotifications);
    const saveWarningDays = this.settingsService.updateWarningDays(designerWarningDays, reviewerWarningDays);
    const saveSyncInterval = this.settingsService.updateSyncInterval(syncIntervalMinutes);
    const saveIndexerTime = this.settingsService.updateIndexerScheduledTime(indexerScheduledTime);

    // Execute all saves
    saveFileStorage.subscribe({
      next: () => {
        saveSignatureStorage.subscribe({
          next: () => {
            saveIndexRoots.subscribe({
              next: () => {
                saveNotification.subscribe({
                  next: () => {
                    saveWarningDays.subscribe({
                      next: () => {
                        saveSyncInterval.subscribe({
                          next: () => {
                            saveIndexerTime.subscribe({
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
                                console.error('Error saving indexer scheduled time:', error);
                                this.snackBar.open('Đã lưu các cài đặt khác nhưng không thể lưu giờ chạy indexer.', 'Đóng', {
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
                        console.error('Error saving sync interval:', error);
                        this.snackBar.open('Đã lưu các cài đặt khác nhưng không thể lưu thời gian đồng bộ.', 'Đóng', {
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
                console.error('Error saving index roots:', error);
                this.snackBar.open('Đã lưu đường dẫn file/chữ ký nhưng không thể lưu đường dẫn ổ mạng (INDEX_ROOTS).', 'Đóng', {
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

  loadIndexStatus() {
    if (!this.isAdmin()) return;
    this.traCuuFilesService.getIndexStatus().subscribe({
      next: (status) => {
        this.indexStatus.set(status);
        if (status.status === 'running') {
          this.startIndexStatusPolling();
        } else {
          this.stopIndexStatusPolling();
        }
      },
      error: () => {
        this.indexStatus.set(null);
        this.stopIndexStatusPolling();
      }
    });
  }

  private startIndexStatusPolling() {
    this.stopIndexStatusPolling();
    this.indexStatusPollTimer = setInterval(() => {
      this.traCuuFilesService.getIndexStatus().subscribe({
        next: (status) => {
          this.indexStatus.set(status);
          if (status.status !== 'running') {
            this.stopIndexStatusPolling();
          }
        }
      });
    }, 3000);
  }

  private stopIndexStatusPolling() {
    if (this.indexStatusPollTimer) {
      clearInterval(this.indexStatusPollTimer);
      this.indexStatusPollTimer = null;
    }
  }

  runIndexerNow() {
    if (!this.isAdmin()) return;
    this.isTriggeringIndex.set(true);
    this.traCuuFilesService.triggerIndexNow().subscribe({
      next: (res) => {
        this.isTriggeringIndex.set(false);
        this.loadIndexStatus(); // cập nhật trạng thái (running) và bắt đầu polling
        this.snackBar.open(res.message || 'Đã kích hoạt chạy indexer. Index đang chạy nền.', 'Đóng', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
      },
      error: (err) => {
        this.isTriggeringIndex.set(false);
        console.error('Error triggering index:', err);
        const msg = err.error?.error || err.message || 'Không thể kết nối tới service tìm file. Kiểm tra Python service đã chạy (port 8000).';
        this.snackBar.open(msg, 'Đóng', {
          duration: 6000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}

