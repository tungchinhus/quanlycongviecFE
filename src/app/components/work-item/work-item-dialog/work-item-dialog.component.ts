import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { DD_MM_YYYY_FORMAT, CustomDateAdapter } from '../../../config/date-format.config';
import { environment } from '../../../../environments/environment';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { WorkItemService } from '../../../services/work-item.service';
import { FileService } from '../../../services/file.service';
import { AuthService, AuthUser } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';
import { WorkItemWithAssignment } from '../../../models/machine-assignment.model';
import { FileDocument } from '../../../models/file.model';

@Component({
  selector: 'app-work-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  templateUrl: './work-item-dialog.component.html',
  styleUrls: ['./work-item-dialog.component.css']
})
export class WorkItemDialogComponent implements OnInit {
  workItemForm: FormGroup;
  mode: 'view' | 'edit' | 'create' = 'create';
  workItem: WorkItemWithAssignment | null = null;
  assignmentId: number | null = null;
  currentUserName: string = '';
  currentUser: any = null;
  readonly selectedFiles = signal<File[]>([]);
  readonly isUploading = signal<boolean>(false);
  files: FileDocument[] = [];
  users: AuthUser[] = [];
  assignmentFiles: FileDocument[] = []; // File giao việc (file của designer)
  userFiles: FileDocument[] = []; // File của user hiện tại
  
  // Lưu giá trị ban đầu để so sánh thay đổi
  private initialFormValues: any = null;
  private hasChanges = signal<boolean>(false);

  // Mapping workType sang tiếng Việt
  private workTypeMap: { [key: string]: string } = {
    'Core Design': 'Thiết kế ruột',
    'Core Review': 'Kiểm soát ruột',
    'Casing Design': 'Thiết kế vỏ',
    'Casing Review': 'Kiểm soát vỏ',
    'Material Leveling': 'Định mức vật tư'
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<WorkItemDialogComponent>,
    private workItemService: WorkItemService,
    private fileService: FileService,
    private authService: AuthService,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { 
      workItem?: WorkItemWithAssignment;
      mode?: 'view' | 'edit' | 'create';
      assignments?: any[];
    }
  ) {
    this.mode = data.mode || 'create';
    this.workItem = data.workItem || null;
    this.assignmentId = this.getAssignmentId(this.workItem);
    
    // Lấy thông tin user đang login
    this.currentUser = this.authService.user();
    this.currentUserName = this.currentUser?.name || this.currentUser?.userName || '';

    // Loại công việc luôn disabled (chỉ hiển thị)
    this.workItemForm = this.fb.group({
      workType: [{ value: '', disabled: true }], // Luôn disabled
      startDate: [{ value: null, disabled: this.mode === 'view' }],
      expectedFinish: [{ value: null, disabled: this.mode === 'view' }],
      actualFinish: [{ value: null, disabled: this.mode === 'view' }],
      personConfirmation: [{ value: false, disabled: this.mode === 'view' }],
      notes: [{ value: '', disabled: this.mode === 'view' }]
    });
  }

  ngOnInit() {
    // Đảm bảo assignmentId được lấy đúng từ đầu
    if (this.workItem) {
      this.assignmentId = this.getAssignmentId(this.workItem);
      console.log('ngOnInit - assignmentId:', this.assignmentId, 'workItem:', this.workItem);
      
      // Populate form với data từ workItem ngay lập tức
      const formValues = {
        workType: this.getWorkTypeDisplayName(this.workItem.workType || ''),
        startDate: this.workItem.startDate ? new Date(this.workItem.startDate) : null,
        expectedFinish: this.workItem.expectedFinish ? new Date(this.workItem.expectedFinish) : null,
        actualFinish: this.workItem.actualFinish ? new Date(this.workItem.actualFinish) : null,
        personConfirmation: this.workItem.personConfirmation || false,
        notes: this.workItem.notes || ''
      };
      
      this.workItemForm.patchValue(formValues);
      
      // Lưu giá trị ban đầu để so sánh thay đổi
      this.initialFormValues = this.getFormValuesForComparison(formValues);
      
      // Load files ngay lập tức (không đợi users)
      if (this.assignmentId) {
        this.loadFiles();
      } else {
        console.warn('Cannot load files: assignmentId is null');
      }
    }
    
    // Load users song song (không block việc load files)
    this.loadUsers().subscribe({
      next: () => {
        // Sau khi users đã load xong, reload files để phân loại đúng
        if (this.workItem && this.assignmentId) {
          console.log('Users loaded, reloading files to re-separate');
          this.loadFiles();
        }
      },
      error: (err) => {
        console.error('Error loading users:', err);
        // Vẫn tiếp tục, files đã được load trước đó
      }
    });
    
    // Subscribe vào form changes để detect thay đổi
    this.workItemForm.valueChanges.subscribe(() => {
      this.checkForChanges();
    });
  }
  
  // Helper method để normalize giá trị form để so sánh
  private getFormValuesForComparison(values: any): any {
    return {
      startDate: values.startDate ? new Date(values.startDate).toISOString().split('T')[0] : null,
      expectedFinish: values.expectedFinish ? new Date(values.expectedFinish).toISOString().split('T')[0] : null,
      actualFinish: values.actualFinish ? new Date(values.actualFinish).toISOString().split('T')[0] : null,
      personConfirmation: values.personConfirmation || false,
      notes: (values.notes || '').trim()
    };
  }
  
  // Kiểm tra xem có thay đổi không
  private checkForChanges(): void {
    if (!this.initialFormValues) {
      // Nếu chưa có initial values (create mode), enable nút nếu form valid
      this.hasChanges.set(this.workItemForm.valid);
      return;
    }
    
    const currentValues = this.workItemForm.getRawValue();
    const currentForComparison = this.getFormValuesForComparison(currentValues);
    
    // So sánh từng field
    const hasFormChanges = 
      currentForComparison.startDate !== this.initialFormValues.startDate ||
      currentForComparison.expectedFinish !== this.initialFormValues.expectedFinish ||
      currentForComparison.actualFinish !== this.initialFormValues.actualFinish ||
      currentForComparison.personConfirmation !== this.initialFormValues.personConfirmation ||
      currentForComparison.notes !== this.initialFormValues.notes;
    
    // Có file mới được chọn
    const hasNewFiles = this.selectedFiles().length > 0;
    
    // Có thay đổi nếu form thay đổi hoặc có file mới
    this.hasChanges.set(hasFormChanges || hasNewFiles);
  }

  getWorkTypeDisplayName(workType: string): string {
    return this.workTypeMap[workType] || workType;
  }

  // Convert từ tiếng Việt về tiếng Anh (reverse mapping)
  getWorkTypeEnglish(displayName: string): string {
    const reverseMap: { [key: string]: string } = {
      'Thiết kế ruột': 'Core Design',
      'Kiểm soát ruột': 'Core Review',
      'Thiết kế vỏ': 'Casing Design',
      'Kiểm soát vỏ': 'Casing Review',
      'Định mức vật tư': 'Material Leveling'
    };
    return reverseMap[displayName] || displayName;
  }

  loadFiles() {
    if (!this.assignmentId) {
      console.warn('Cannot load files: assignmentId is null or undefined');
      return;
    }
    
    console.log('Loading files for assignmentId:', this.assignmentId);
    this.fileService.getFilesByAssignment(this.assignmentId).subscribe({
      next: (files) => {
        console.log('Files loaded from API:', files);
        // Tách files thành 2 nhóm: file giao việc và file của user
        this.separateFiles(files);
        
        // Set files để hiển thị (bao gồm cả file giao việc và file của user)
        this.files = [...this.assignmentFiles, ...this.userFiles];
        console.log('Files after separation:', {
          assignmentFiles: this.assignmentFiles.length,
          userFiles: this.userFiles.length,
          total: this.files.length
        });
      },
      error: (err) => {
        console.error('Error loading files:', err);
        // Hiển thị thông báo lỗi cho user
        this.snackBar.open('Lỗi khi tải danh sách file. Vui lòng thử lại.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  separateFiles(files: FileDocument[]) {
    // Reset
    this.assignmentFiles = [];
    this.userFiles = [];
    
    if (!files || files.length === 0) {
      console.log('No files to separate');
      return;
    }
    
    if (!this.workItem) {
      console.warn('No workItem, cannot separate files');
      this.files = files;
      return;
    }

    const assignment = this.workItem.assignment;
    if (!assignment) {
      console.warn('No assignment in workItem, cannot separate files');
      this.files = files;
      return;
    }

    // Lấy ID của người giao việc (designer)
    const designerId = assignment.designer;
    console.log('Separating files - designerId:', designerId, 'currentUser:', this.currentUser);
    
    // Tìm user designer từ danh sách users để lấy userName
    let designerUser: AuthUser | undefined;
    if (designerId && this.users.length > 0) {
      designerUser = this.users.find(u => 
        u.id === designerId ||
        u.id?.toString() === designerId ||
        u.userId?.toString() === designerId
      );
    }
    
    // Tạo danh sách các identifier có thể của designer
    const designerIdentifiers: string[] = [];
    if (designerId) {
      designerIdentifiers.push(designerId.toString());
    }
    if (designerUser) {
      if (designerUser.userName) designerIdentifiers.push(designerUser.userName);
      if (designerUser.name) designerIdentifiers.push(designerUser.name);
      if (designerUser.email) designerIdentifiers.push(designerUser.email);
      if (designerUser.id) designerIdentifiers.push(designerUser.id.toString());
      if (designerUser.userId) designerIdentifiers.push(designerUser.userId.toString());
    }
    
    console.log('Designer identifiers:', designerIdentifiers);
    
    files.forEach(file => {
      const uploadedBy = file.uploadedBy || file.uploadBy;
      console.log(`Processing file: ${file.fileName}, uploadedBy: ${uploadedBy}`);
      
      // Kiểm tra nếu là file của designer (người giao việc)
      let isDesignerFile = false;
      
      // Nếu không có uploadedBy, coi như file giao việc (an toàn)
      if (!uploadedBy) {
        isDesignerFile = true;
        console.log(`  -> File has no uploadedBy, treating as designer file`);
      } else if (designerIdentifiers.length > 0) {
        // So sánh với tất cả các identifier của designer
        isDesignerFile = designerIdentifiers.some(id => 
          id && uploadedBy && id.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
        );
        if (isDesignerFile) {
          console.log(`  -> File is designer file (matched: ${uploadedBy})`);
        }
      }

      // Kiểm tra nếu là file của user hiện tại (chỉ khi có currentUser)
      let isCurrentUserFile = false;
      if (this.currentUser && uploadedBy) {
        const currentUserIdentifiers = [
          this.currentUser.userName,
          this.currentUser.id?.toString(),
          this.currentUser.userId?.toString(),
          this.currentUser.email,
          this.currentUser.name
        ].filter(id => id);
        
        console.log(`  -> Current user identifiers:`, currentUserIdentifiers);
        
        isCurrentUserFile = currentUserIdentifiers.some(id => 
          id && uploadedBy && id.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
        );
        if (isCurrentUserFile) {
          console.log(`  -> File is current user file (matched: ${uploadedBy})`);
        }
      }

      // Chỉ hiển thị:
      // - File giao việc (designer upload hoặc không có uploadedBy)
      // - File chính user đang đăng nhập upload
      if (isCurrentUserFile) {
        this.userFiles.push(file);
        console.log(`  -> Added to userFiles`);
      } else if (isDesignerFile) {
        this.assignmentFiles.push(file);
        console.log(`  -> Added to assignmentFiles`);
      } else {
        console.log(`  -> File ignored (not designer or current user)`);
      }
      // Các file khác (người thứ 3) sẽ bị bỏ qua theo yêu cầu
    });
    
    console.log('Separated files result:', {
      assignmentFiles: this.assignmentFiles.length,
      userFiles: this.userFiles.length,
      designerId,
      designerUser: designerUser?.userName,
      currentUser: this.currentUser?.userName
    });
  }

  isDesignWorkItem(): boolean {
    if (!this.workItem) return false;
    const workType = this.workItem.workType;
    return workType === 'Casing Design' || workType === 'Core Design';
  }

  loadUsers() {
    return this.usersService.loadUsers(1, 100).pipe(
      catchError(err => {
        console.error('Error loading users:', err);
        return of([]); // Return empty array on error
      })
    ).pipe(
      tap(users => {
        this.users = users;
      })
    );
  }


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      this.selectedFiles.set([...this.selectedFiles(), ...newFiles]);
      // Reset input để có thể chọn lại file giống nhau
      input.value = '';
      // Không tự động upload, chỉ upload khi bấm Lưu
      // Check changes sau khi thêm file
      this.checkForChanges();
    }
  }

  removeFile(index: number) {
    const files = this.selectedFiles();
    files.splice(index, 1);
    this.selectedFiles.set([...files]);
    // Check changes sau khi xóa file
    this.checkForChanges();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  uploadFiles(): Promise<boolean> {
    const files = this.selectedFiles();
    if (files.length === 0 || !this.workItem?.assignmentID) {
      return Promise.resolve(true);
    }

    this.isUploading.set(true);
    const assignmentID = this.workItem.assignmentID;
    
    const uploadObservables = files.map(file => 
      this.fileService.uploadFile(
        file, 
        assignmentID, 
        `File đính kèm cho công việc #${this.workItem?.workItemID}`
      ).pipe(
        catchError(error => {
          console.error(`Error uploading file ${file.name}:`, error);
          // Trả về object chứa thông tin lỗi thay vì null
          return of({ error: true, fileName: file.name, errorMessage: error.error?.message || error.message || 'Lỗi không xác định' });
        })
      )
    );

    return new Promise((resolve) => {
      forkJoin(uploadObservables).subscribe({
        next: (results) => {
          const successFiles = results.filter(r => r !== null && !(r as any).error) as FileDocument[];
          const failedFiles = results.filter(r => r !== null && (r as any).error) as any[];
          const successCount = successFiles.length;
          const failCount = failedFiles.length;

          this.isUploading.set(false);
          this.selectedFiles.set([]);

          // Reload files list
          this.loadFiles();

          if (failCount === 0) {
            // Không hiển thị snackbar ở đây vì đã có thông báo ở onSave
            resolve(true);
          } else {
            // Log chi tiết lỗi
            failedFiles.forEach(f => {
              console.error(`Failed to upload ${f.fileName}: ${f.errorMessage}`);
            });
            // Trả về false để onSave có thể hiển thị cảnh báo
            resolve(false);
          }
        },
        error: (err) => {
          this.isUploading.set(false);
          console.error('Error uploading files:', err);
          // Reload files list ngay cả khi có lỗi (có thể một số file đã upload thành công)
          this.loadFiles();
          // Không hiển thị snackbar ở đây, để onSave xử lý
          resolve(false);
        }
      });
    });
  }

  private getAssignmentId(workItem?: WorkItemWithAssignment | null): number | null {
    if (!workItem) {
      console.warn('getAssignmentId: workItem is null or undefined');
      return null;
    }
    
    // Chuẩn hóa lấy assignmentId dù backend trả camelCase hay PascalCase
    const idFromWorkItem = (workItem as any).assignmentId || workItem.assignmentID;
    const idFromAssignment = workItem.assignment?.assignmentID || (workItem.assignment as any)?.assignmentId;
    const finalId = idFromWorkItem || idFromAssignment;
    
    console.log('getAssignmentId - workItem:', {
      assignmentID: workItem.assignmentID,
      assignmentId: (workItem as any).assignmentId,
      assignment: workItem.assignment,
      idFromWorkItem,
      idFromAssignment,
      finalId
    });
    
    const result = finalId && Number(finalId) > 0 ? Number(finalId) : null;
    console.log('getAssignmentId result:', result);
    return result;
  }

  deleteFile(file: FileDocument) {
    const fileId = file.id || file.fileID;
    if (!fileId) return;

    if (confirm('Bạn có chắc muốn xóa file này?')) {
      // Xóa file khỏi danh sách ngay lập tức để UI responsive hơn
      this.files = this.files.filter(f => (f.id || f.fileID) !== fileId);
      this.assignmentFiles = this.assignmentFiles.filter(f => (f.id || f.fileID) !== fileId);
      this.userFiles = this.userFiles.filter(f => (f.id || f.fileID) !== fileId);

      this.fileService.deleteFile(fileId).subscribe({
        next: () => {
          this.snackBar.open('Xóa file thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          
          // Reload danh sách file sau khi xóa thành công
          // Thêm delay nhỏ để đảm bảo backend đã xử lý xong
          setTimeout(() => {
            this.loadFiles();
          }, 300);
        },
        error: (err) => {
          console.error('Error deleting file:', err);
          // Nếu xóa thất bại, reload lại danh sách để hiển thị đúng
          this.loadFiles();
          this.snackBar.open('Lỗi khi xóa file. Vui lòng thử lại.', 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Xây dựng URL tải trực tiếp từ backend (dùng cho custom protocol)
  private buildDownloadUrl(file: FileDocument): string {
    const fileId = file.id || file.fileID;
    if (!fileId) return '';
    return `${environment.apiUrl}/files/${fileId}/download`;
  }

  // Nhận diện file CAD
  private isCadFile(fileName?: string): boolean {
    if (!fileName) return false;
    const lower = fileName.toLowerCase();
    return lower.endsWith('.dwg') || lower.endsWith('.dxf');
  }

  // Handler chung khi click mở file
  openFile(file: FileDocument, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const downloadUrl = this.buildDownloadUrl(file);
    if (this.isCadFile(file.fileName) && downloadUrl) {
      // Dùng custom protocol cadopen:// để app desktop mở AutoCAD
      const cadUrl = `cadopen://open?fileId=${encodeURIComponent(file.id || file.fileID || '')}` +
        `&name=${encodeURIComponent(file.fileName || '')}` +
        `&url=${encodeURIComponent(downloadUrl)}`;
      window.location.href = cadUrl;
      return;
    }

    // Mặc định: mở xem trong tab mới
    this.viewFile(file);
  }

  viewFile(file: FileDocument) {
    const fileId = file.id || file.fileID;
    if (!fileId) return;

    this.fileService.downloadFile(fileId).subscribe({
      next: (blob) => {
        // Nếu backend trả lỗi json nhỏ, hiển thị thông báo
        if (blob.type === 'application/json' || blob.size < 100) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorText = reader.result as string;
              const errorObj = JSON.parse(errorText);
              this.snackBar.open(
                errorObj.message || errorObj.error || 'Lỗi khi xem file',
                'Đóng',
                {
                  duration: 5000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['error-snackbar']
                }
              );
            } catch {
              this.snackBar.open('Lỗi khi xem file', 'Đóng', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
              });
            }
          };
          reader.readAsText(blob);
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');

        // Fallback nếu popup bị chặn
        if (!newWindow) {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      error: (err) => {
        console.error('Error viewing file:', err);
        const errorMessage = err.error?.message || err.error?.error || err.message || 'Lỗi khi xem file';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  downloadFile(file: FileDocument) {
    const fileId = file.id || file.fileID;
    if (!fileId) return;

    this.fileService.downloadFile(fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName || 'download';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading file:', err);
        this.snackBar.open('Lỗi khi tải file. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  async onSave() {
    if (this.mode === 'view') {
      this.dialogRef.close();
      return;
    }

    if (!this.workItemForm.valid || !this.workItem) {
      this.snackBar.open('Vui lòng điền đầy đủ thông tin', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Kiểm tra workItemID có tồn tại
    if (!this.workItem.workItemID || this.workItem.workItemID <= 0) {
      this.snackBar.open('Không tìm thấy công việc cần cập nhật', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const formValue = this.workItemForm.getRawValue();
    
    // Lấy workType từ workItem gốc (tiếng Anh) thay vì từ form (tiếng Việt)
    // Hoặc convert từ tiếng Việt về tiếng Anh nếu cần
    const workTypeEnglish = this.workItem?.workType || this.getWorkTypeEnglish(formValue.workType);
    
    // Xây dựng updateData object - chỉ gửi các field có giá trị
    const updateData: any = {};
    
    // WorkType: lấy từ workItem gốc (tiếng Anh) hoặc convert từ tiếng Việt
    if (workTypeEnglish) {
      updateData.workType = workTypeEnglish;
    }
    
    // Dates: chỉ gửi nếu có giá trị
    if (formValue.startDate) {
      updateData.startDate = new Date(formValue.startDate).toISOString();
    }
    if (formValue.expectedFinish) {
      updateData.expectedFinish = new Date(formValue.expectedFinish).toISOString();
    }
    if (formValue.actualFinish) {
      updateData.actualFinish = new Date(formValue.actualFinish).toISOString();
    }
    
    // PersonConfirmation: gửi cả false
    if (formValue.personConfirmation !== undefined && formValue.personConfirmation !== null) {
      updateData.personConfirmation = formValue.personConfirmation;
    }
    
    // Notes: chỉ gửi nếu có giá trị
    if (formValue.notes) {
      updateData.notes = formValue.notes;
    }

    // Log để debug
    console.log('Updating work item:', this.workItem.workItemID);
    console.log('Update data:', updateData);
    console.log('Original workItem.workType:', this.workItem?.workType);

    // Cập nhật work item TRƯỚC, chỉ upload file khi update thành công
    this.workItemService.updateWorkItem(this.workItem.workItemID, updateData).subscribe({
      next: async () => {
        // Chỉ upload files sau khi work item đã được cập nhật thành công
        if (this.selectedFiles().length > 0) {
          const uploadSuccess = await this.uploadFiles();
          if (!uploadSuccess) {
            // Nếu upload file thất bại, vẫn hiển thị thông báo thành công cho work item
            // nhưng cảnh báo về file
            this.snackBar.open('Cập nhật công việc thành công, nhưng có lỗi khi upload file', 'Đóng', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            });
          } else {
            this.snackBar.open('Cập nhật công việc và upload file thành công!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
          }
        } else {
          this.snackBar.open('Cập nhật công việc thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        }
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating work item:', err);
        
        // Xử lý các loại lỗi khác nhau
        let errorMessage = 'Lỗi khi cập nhật công việc';
        
        if (err.status === 404) {
          errorMessage = 'Không tìm thấy công việc cần cập nhật. Vui lòng làm mới trang và thử lại.';
        } else if (err.status === 400) {
          errorMessage = err.error?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
        } else if (err.status === 500) {
          errorMessage = err.error?.message || 'Lỗi server. Vui lòng thử lại sau.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        }
        
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

  getTitle(): string {
    if (this.mode === 'view') {
      return 'Chi Tiết Công Việc';
    } else if (this.mode === 'edit') {
      return 'Cập nhật';
    }
    return 'Tạo Công Việc Mới';
  }

  isViewMode(): boolean {
    return this.mode === 'view';
  }

  canSave(): boolean {
    // Nếu là create mode, check form valid
    if (this.mode === 'create') {
      return this.workItemForm.valid;
    }
    
    // Nếu là edit mode, check có thay đổi
    // Nút Lưu sáng khi:
    // 1. Form valid VÀ có thay đổi so với giá trị ban đầu
    // 2. Hoặc có file mới được chọn
    return this.workItemForm.valid && this.hasChanges();
  }

  canDeleteFile(file: FileDocument): boolean {
    // Kiểm tra user đang đăng nhập
    if (!this.currentUser) {
      return false;
    }
    
    // Lấy thông tin uploadedBy của file
    const uploadedBy = file.uploadedBy || file.uploadBy;
    if (!uploadedBy) {
      // Nếu không có thông tin uploadedBy, không cho phép xóa (an toàn)
      return false;
    }
    
    // Backend trả về uploadedBy là userName (từ ClaimTypes.Name = user.UserName)
    // So sánh uploadedBy với thông tin user đang đăng nhập
    // Nếu khác thì không hiển thị icon delete
    const isOwner = (
      uploadedBy === this.currentUser.userName ||
      uploadedBy === this.currentUser.id ||
      uploadedBy === this.currentUser.id?.toString() ||
      uploadedBy === this.currentUser.userId?.toString() ||
      uploadedBy === this.currentUser.email
    );
    
    return isOwner;
  }
}

