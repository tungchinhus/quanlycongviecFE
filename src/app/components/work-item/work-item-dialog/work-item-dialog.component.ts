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
import { parseDateSafe, formatDateOnly } from '../../../utils/date.util';

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
  
  // Ngày tối thiểu cho date picker (hôm nay)
  readonly minDate = new Date();
  
  // Lưu giá trị ban đầu để so sánh thay đổi
  private initialFormValues: any = null;
  private hasChanges = signal<boolean>(false);

  // Mapping workType sang nhãn hiển thị
  private workTypeMap: { [key: string]: string } = {
    'Core Design': 'T.Kế ruột',
    'Core Review': 'K.Soát ruột',
    'Casing Design': 'T.Kế vỏ',
    'Casing Review': 'K.Soát vỏ',
    'Material Leveling': 'Đ.mức vật tư'
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
    // Lấy deliveryDate từ assignment để validate
    const deliveryDate = this.workItem?.assignment?.deliveryDate 
      ? (typeof this.workItem.assignment.deliveryDate === 'string' 
          ? new Date(this.workItem.assignment.deliveryDate) 
          : this.workItem.assignment.deliveryDate)
      : null;
    
    this.workItemForm = this.fb.group({
      workType: [{ value: '', disabled: true }], // Luôn disabled
      startDate: [{ 
        value: null, 
        disabled: this.mode === 'view' 
      }, [
        this.dateNotInPastValidator(),
        this.dateBeforeDeliveryValidator(deliveryDate),
        this.dateBeforeExpectedFinishValidator()
      ]],
      expectedFinish: [{ 
        value: null, 
        disabled: this.mode === 'view' 
      }, [
        this.dateNotInPastValidator(),
        this.dateBeforeDeliveryValidator(deliveryDate),
        this.dateAfterStartDateValidator(),
        this.dateBeforeActualFinishValidator()
      ]],
      actualFinish: [{ 
        value: null, 
        disabled: this.mode === 'view' 
      }, [
        this.dateNotInPastValidator(),
        this.dateBeforeDeliveryValidator(deliveryDate),
        this.dateAfterExpectedFinishValidator()
      ]],
      personConfirmation: [{ value: false, disabled: this.mode === 'view' }],
      notes: [{ value: '', disabled: this.mode === 'view' }]
    });
  }

  ngOnInit() {
    // Đảm bảo assignmentId được lấy đúng từ đầu
    if (this.workItem) {
      this.assignmentId = this.getAssignmentId(this.workItem);
      
      // Kiểm tra nếu assignment bị locked - disable form trong edit mode
      // Nhưng cho phép chỉnh sửa nếu workitem chưa xác nhận (user thiết kế cần chỉnh sửa khi chưa xác nhận)
      const isLocked = this.workItem.assignment?.isLocked === true;
      const isNotConfirmed = !this.workItem.personConfirmation;
      const isDesignWorkItem = this.workItem.workType === 'Core Design' || this.workItem.workType === 'Casing Design';
      
      // Chỉ disable form nếu assignment bị locked VÀ workitem đã được xác nhận
      // Cho phép chỉnh sửa nếu workitem chưa xác nhận (đặc biệt cho user thiết kế)
      if (isLocked && this.mode === 'edit' && !isNotConfirmed) {
        // Disable tất cả các field khi assignment bị locked và workitem đã xác nhận
        this.workItemForm.disable();
      }
      
      // Cập nhật validators với deliveryDate từ assignment
      const deliveryDate = this.workItem.assignment?.deliveryDate 
        ? (typeof this.workItem.assignment.deliveryDate === 'string' 
            ? new Date(this.workItem.assignment.deliveryDate) 
            : this.workItem.assignment.deliveryDate)
        : null;
      
      // Cập nhật validators cho các date fields
      if (deliveryDate) {
        this.workItemForm.get('startDate')?.setValidators([
          this.dateNotInPastValidator(),
          this.dateBeforeDeliveryValidator(deliveryDate),
          this.dateBeforeExpectedFinishValidator()
        ]);
        this.workItemForm.get('expectedFinish')?.setValidators([
          this.dateNotInPastValidator(),
          this.dateBeforeDeliveryValidator(deliveryDate),
          this.dateAfterStartDateValidator(),
          this.dateBeforeActualFinishValidator()
        ]);
        this.workItemForm.get('actualFinish')?.setValidators([
          this.dateNotInPastValidator(),
          this.dateBeforeDeliveryValidator(deliveryDate),
          this.dateAfterExpectedFinishValidator()
        ]);
      } else {
        // Nếu không có deliveryDate, vẫn validate thứ tự ngày
        this.workItemForm.get('startDate')?.setValidators([
          this.dateNotInPastValidator(),
          this.dateBeforeExpectedFinishValidator()
        ]);
        this.workItemForm.get('expectedFinish')?.setValidators([
          this.dateNotInPastValidator(),
          this.dateAfterStartDateValidator(),
          this.dateBeforeActualFinishValidator()
        ]);
        this.workItemForm.get('actualFinish')?.setValidators([
          this.dateNotInPastValidator(),
          this.dateAfterExpectedFinishValidator()
        ]);
      }
      
      // Populate form với data từ workItem ngay lập tức
      // Sử dụng parseDateSafe để tránh lỗi timezone khi parse date từ API
      const formValues = {
        workType: this.getWorkTypeDisplayName(this.workItem.workType || ''),
        startDate: parseDateSafe(this.workItem.startDate),
        expectedFinish: parseDateSafe(this.workItem.expectedFinish),
        actualFinish: parseDateSafe(this.workItem.actualFinish),
        personConfirmation: this.workItem.personConfirmation || false,
        notes: this.workItem.notes || ''
      };
      
      this.workItemForm.patchValue(formValues);
      
      // Setup cross-field validation: khi một field thay đổi, validate lại field liên quan
      this.workItemForm.get('startDate')?.valueChanges.subscribe(() => {
        this.workItemForm.get('expectedFinish')?.updateValueAndValidity({ emitEvent: false });
      });
      
      this.workItemForm.get('expectedFinish')?.valueChanges.subscribe(() => {
        this.workItemForm.get('startDate')?.updateValueAndValidity({ emitEvent: false });
        this.workItemForm.get('actualFinish')?.updateValueAndValidity({ emitEvent: false });
      });
      
      this.workItemForm.get('actualFinish')?.valueChanges.subscribe(() => {
        this.workItemForm.get('expectedFinish')?.updateValueAndValidity({ emitEvent: false });
      });
      
      // Trigger validation lại sau khi patchValue
      this.workItemForm.get('startDate')?.updateValueAndValidity({ emitEvent: false });
      this.workItemForm.get('expectedFinish')?.updateValueAndValidity({ emitEvent: false });
      this.workItemForm.get('actualFinish')?.updateValueAndValidity({ emitEvent: false });
      
      // Lưu giá trị ban đầu để so sánh thay đổi
      this.initialFormValues = this.getFormValuesForComparison(formValues);
      
      // Load files ngay lập tức (không đợi users)
      if (this.assignmentId) {
        this.loadFiles();
      }
    }
    
    // Load users song song (không block việc load files)
    this.loadUsers().subscribe({
      next: () => {
        // Sau khi users đã load xong, reload files để phân loại đúng
        if (this.workItem && this.assignmentId) {
          this.loadFiles();
        }
      },
      error: (err) => {
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
      startDate: values.startDate ? this.formatDateOnly(new Date(values.startDate)) : null,
      expectedFinish: values.expectedFinish ? this.formatDateOnly(new Date(values.expectedFinish)) : null,
      actualFinish: values.actualFinish ? this.formatDateOnly(new Date(values.actualFinish)) : null,
      personConfirmation: values.personConfirmation || false,
      notes: (values.notes || '').trim()
    };
  }

  /**
   * Format date to YYYY-MM-DD string (date only, no timezone conversion)
   */
  private formatDateOnly(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  // Convert từ nhãn hiển thị về workType (reverse mapping)
  getWorkTypeEnglish(displayName: string): string {
    const reverseMap: { [key: string]: string } = {
      'T.Kế ruột': 'Core Design',
      'K.Soát ruột': 'Core Review',
      'T.Kế vỏ': 'Casing Design',
      'K.Soát vỏ': 'Casing Review',
      'Đ.mức vật tư': 'Material Leveling'
    };
    return reverseMap[displayName] || displayName;
  }

  loadFiles() {
    if (!this.assignmentId) {
      return;
    }
    
    this.fileService.getFilesByAssignment(this.assignmentId).subscribe({
      next: (files) => {
        // Tách files thành 2 nhóm: file giao việc và file của user
        this.separateFiles(files);
        
        // Set files để hiển thị (bao gồm cả file giao việc và file của user)
        this.files = [...this.assignmentFiles, ...this.userFiles];
      },
      error: (err) => {
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
      return;
    }
    
    if (!this.workItem) {
      this.files = files;
      return;
    }

    const assignment = this.workItem.assignment;
    if (!assignment) {
      this.files = files;
      return;
    }

    // Lấy ID của người giao việc (designer)
    const designerId = assignment.designer;
    
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
    
    files.forEach(file => {
      const uploadedBy = file.uploadedBy || file.uploadBy;
      
      // Kiểm tra nếu là file của designer (người giao việc)
      let isDesignerFile = false;
      
      // Nếu không có uploadedBy, coi như file giao việc (an toàn)
      if (!uploadedBy) {
        isDesignerFile = true;
      } else if (designerIdentifiers.length > 0) {
        // So sánh với tất cả các identifier của designer
        isDesignerFile = designerIdentifiers.some(id => 
          id && uploadedBy && id.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
        );
      }

      // Kiểm tra nếu là file của user hiện tại
      // Có 3 cách: 
      // 1. File có UploadedBy = currentUser
      // 2. File có UploadedBy = PersonName của work item VÀ PersonName = currentUser
      // 3. File có ID trong file_ID của work item VÀ work item có PersonName = currentUser
      let isCurrentUserFile = false;
      
      if (this.currentUser) {
        const currentUserIdentifiers = [
          this.currentUser.userName,
          this.currentUser.id?.toString(),
          this.currentUser.userId?.toString(),
          this.currentUser.email,
          this.currentUser.name,
          this.currentUser.firebaseUid
        ].filter(id => id);
        
        // Cách 1: Kiểm tra UploadedBy của file trực tiếp với currentUser
        if (uploadedBy) {
          isCurrentUserFile = currentUserIdentifiers.some(id => 
            id && uploadedBy && id.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
          );
        }
        
        // Cách 2 & 3: Kiểm tra qua work item PersonName
        if (!isCurrentUserFile && this.workItem) {
          const workItemPersonName = this.workItem.personName;
          
          if (workItemPersonName) {
            // Tạo danh sách các identifier có thể của PersonName (có thể là ID, userName, name, etc)
            const workItemPersonNameIdentifiers = [workItemPersonName.toString()];
            
            // Tìm user từ PersonName trong danh sách users để lấy thêm identifiers
            const workItemUser = this.users.find(u => 
              u.id === workItemPersonName ||
              u.id?.toString() === workItemPersonName ||
              u.userId?.toString() === workItemPersonName ||
              u.userName === workItemPersonName ||
              u.name === workItemPersonName ||
              u.email === workItemPersonName
            );
            
            if (workItemUser) {
              if (workItemUser.userName) workItemPersonNameIdentifiers.push(workItemUser.userName);
              if (workItemUser.name) workItemPersonNameIdentifiers.push(workItemUser.name);
              if (workItemUser.email) workItemPersonNameIdentifiers.push(workItemUser.email);
              if (workItemUser.id) workItemPersonNameIdentifiers.push(workItemUser.id.toString());
              if (workItemUser.userId) workItemPersonNameIdentifiers.push(workItemUser.userId.toString());
              if (workItemUser.firebaseUid) workItemPersonNameIdentifiers.push(workItemUser.firebaseUid);
            }
            
            // Kiểm tra xem PersonName của work item có match với currentUser không
            const isPersonNameMatch = currentUserIdentifiers.some(currentId => 
              workItemPersonNameIdentifiers.some(personId => 
                currentId && personId && currentId.toString().toLowerCase() === personId.toString().toLowerCase()
              )
            );
            
            if (isPersonNameMatch) {
              // Cách 2: File có UploadedBy = PersonName của work item (sau khi đã chuyển giao)
              if (uploadedBy) {
                const isUploadedByMatch = workItemPersonNameIdentifiers.some(personId => 
                  personId && uploadedBy && personId.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
                );
                if (isUploadedByMatch) {
                  isCurrentUserFile = true;
                }
              }
              
              // Cách 3: File có ID trong file_ID của work item
              // Đây là cách quan trọng nhất: nếu file có trong File_ID thì chắc chắn là file của work item này
              if (!isCurrentUserFile) {
                const workItemFileIds = this.parseFileIds(this.workItem.file_ID);
                const fileId = file.id || file.fileID;
                const isFileLinkedToWorkItem = fileId && workItemFileIds.includes(fileId);
                
                if (isFileLinkedToWorkItem) {
                  isCurrentUserFile = true;
                }
              }
            }
          }
          
          // Cách 4: Nếu file có ID trong file_ID của work item, thì luôn hiển thị (không cần check PersonName)
          // Điều này đảm bảo files được link qua File_ID sẽ luôn hiển thị
          if (!isCurrentUserFile && this.workItem) {
            const workItemFileIds = this.parseFileIds(this.workItem.file_ID);
            const fileId = file.id || file.fileID;
            const isFileLinkedToWorkItem = fileId && workItemFileIds.includes(fileId);
            
            if (isFileLinkedToWorkItem) {
              // Kiểm tra xem PersonName của work item có match với currentUser không
              const workItemPersonName = this.workItem.personName;
              if (workItemPersonName) {
                const currentUserIdentifiers = [
                  this.currentUser.userName,
                  this.currentUser.id?.toString(),
                  this.currentUser.userId?.toString(),
                  this.currentUser.email,
                  this.currentUser.name,
                  this.currentUser.firebaseUid
                ].filter(id => id);
                
                const workItemPersonNameIdentifiers = [workItemPersonName.toString()];
                const workItemUser = this.users.find(u => 
                  u.id === workItemPersonName ||
                  u.id?.toString() === workItemPersonName ||
                  u.userId?.toString() === workItemPersonName ||
                  u.userName === workItemPersonName ||
                  u.name === workItemPersonName ||
                  u.email === workItemPersonName
                );
                
                if (workItemUser) {
                  if (workItemUser.userName) workItemPersonNameIdentifiers.push(workItemUser.userName);
                  if (workItemUser.name) workItemPersonNameIdentifiers.push(workItemUser.name);
                  if (workItemUser.email) workItemPersonNameIdentifiers.push(workItemUser.email);
                  if (workItemUser.id) workItemPersonNameIdentifiers.push(workItemUser.id.toString());
                  if (workItemUser.userId) workItemPersonNameIdentifiers.push(workItemUser.userId.toString());
                  if (workItemUser.firebaseUid) workItemPersonNameIdentifiers.push(workItemUser.firebaseUid);
                }
                
                const isPersonNameMatch = currentUserIdentifiers.some(currentId => 
                  workItemPersonNameIdentifiers.some(personId => 
                    currentId && personId && currentId.toString().toLowerCase() === personId.toString().toLowerCase()
                  )
                );
                
                if (isPersonNameMatch) {
                  isCurrentUserFile = true;
                }
              }
            }
          }
        }
      }

      // Chỉ hiển thị:
      // - File giao việc (designer upload hoặc không có uploadedBy)
      // - File chính user đang đăng nhập upload
      if (isCurrentUserFile) {
        this.userFiles.push(file);
      } else if (isDesignerFile) {
        this.assignmentFiles.push(file);
      }
      // Các file khác (người thứ 3) sẽ bị bỏ qua theo yêu cầu
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
          
          // Quan trọng: Reload work item để lấy File_ID mới nhất sau khi upload files
          // Backend đã tự động thêm file IDs vào File_ID của work item
          if (this.workItem?.workItemID && successFiles.length > 0) {
            this.workItemService.getWorkItemById(this.workItem.workItemID).subscribe({
              next: (updatedWorkItem) => {
                // Cập nhật File_ID trong workItem để giữ nguyên khi update tiếp theo
                if (updatedWorkItem.file_ID) {
                  this.workItem!.file_ID = updatedWorkItem.file_ID;
                }
              },
              error: (err) => {
                console.error('Error reloading work item after upload:', err);
                // Không block flow nếu reload thất bại
              }
            });
          }

          if (failCount === 0) {
            // Không hiển thị snackbar ở đây vì đã có thông báo ở onSave
            resolve(true);
          } else {
            // Trả về false để onSave có thể hiển thị cảnh báo
            resolve(false);
          }
        },
        error: (err) => {
          this.isUploading.set(false);
          // Reload files list ngay cả khi có lỗi (có thể một số file đã upload thành công)
          this.loadFiles();
          
          // Reload work item để lấy File_ID mới nhất (nếu có file nào đã upload thành công)
          if (this.workItem?.workItemID) {
            this.workItemService.getWorkItemById(this.workItem.workItemID).subscribe({
              next: (updatedWorkItem) => {
                if (updatedWorkItem.file_ID) {
                  this.workItem!.file_ID = updatedWorkItem.file_ID;
                }
              },
              error: (reloadErr) => {
                console.error('Error reloading work item after upload error:', reloadErr);
              }
            });
          }
          
          // Không hiển thị snackbar ở đây, để onSave xử lý
          resolve(false);
        }
      });
    });
  }

  private getAssignmentId(workItem?: WorkItemWithAssignment | null): number | null {
    if (!workItem) {
      return null;
    }
    
    // Chuẩn hóa lấy assignmentId dù backend trả camelCase hay PascalCase
    const idFromWorkItem = (workItem as any).assignmentId || workItem.assignmentID;
    const idFromAssignment = workItem.assignment?.assignmentID || (workItem.assignment as any)?.assignmentId;
    const finalId = idFromWorkItem || idFromAssignment;
    
    const result = finalId && Number(finalId) > 0 ? Number(finalId) : null;
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

    // Kiểm tra nếu assignment bị locked VÀ workitem đã được xác nhận
    // Cho phép save nếu workitem chưa xác nhận (user thiết kế cần chỉnh sửa khi chưa xác nhận)
    const isLocked = this.workItem?.assignment?.isLocked === true;
    const isNotConfirmed = !this.workItem?.personConfirmation;
    
    if (isLocked && !isNotConfirmed) {
      this.snackBar.open('Assignment đã bị khóa. Vui lòng liên hệ user kiểm soát để mở khóa.', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
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
    
    // Dates: chỉ gửi nếu có giá trị - sử dụng formatDateOnly để gửi chỉ date (YYYY-MM-DD)
    // Tránh lỗi timezone khi backend parse date
    if (formValue.startDate) {
      updateData.startDate = formatDateOnly(new Date(formValue.startDate));
    }
    if (formValue.expectedFinish) {
      updateData.expectedFinish = formatDateOnly(new Date(formValue.expectedFinish));
    }
    if (formValue.actualFinish) {
      updateData.actualFinish = formatDateOnly(new Date(formValue.actualFinish));
    }
    
    // PersonConfirmation: gửi cả false
    if (formValue.personConfirmation !== undefined && formValue.personConfirmation !== null) {
      updateData.personConfirmation = formValue.personConfirmation;
    }
    
    // Notes: chỉ gửi nếu có giá trị
    if (formValue.notes) {
      updateData.notes = formValue.notes;
    }
    
    // Quan trọng: Chỉ gửi File_ID nếu có giá trị hợp lệ (không null, không empty)
    // Không gửi File_ID nếu null hoặc empty để tránh overwrite thành rỗng
    // File_ID đã được cập nhật khi upload files hoặc chuyển giao việc, không nên bị overwrite
    const currentFileId = this.workItem.file_ID;
    if (currentFileId && currentFileId.trim() !== '') {
      updateData.file_ID = currentFileId;
    }
    // Nếu File_ID là null hoặc empty, không gửi trong updateData
    // Backend sẽ giữ nguyên giá trị hiện tại trong database

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
    // Cho phép save nếu workitem chưa xác nhận, bất kể assignment có bị khóa hay không
    // User thiết kế cần có thể chỉnh sửa và xác nhận khi chưa xác nhận
    const isNotConfirmed = !this.workItem?.personConfirmation;
    const isLocked = this.workItem?.assignment?.isLocked === true;
    
    // Nếu assignment bị locked VÀ workitem đã được xác nhận, không cho phép save
    if (isLocked && !isNotConfirmed) {
      return false;
    }
    
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

  /**
   * Validator: Kiểm tra ngày không được là quá khứ
   */
  private dateNotInPastValidator(): any {
    return (control: any) => {
      if (!control.value) {
        return null; // Không validate nếu không có giá trị
      }
      
      const inputDate = new Date(control.value);
      const today = new Date();
      
      // Reset time để so sánh chỉ ngày
      inputDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(inputDate.getTime())) {
        return null; // Không validate nếu date không hợp lệ
      }
      
      // Ngày nhập vào phải >= hôm nay
      if (inputDate < today) {
        return { dateInPast: true };
      }
      
      return null;
    };
  }

  /**
   * Custom validator: Kiểm tra ngày nhập vào phải nhỏ hơn ngày giao bảng thiết kế tổng
   */
  private dateBeforeDeliveryValidator(deliveryDate: Date | null): any {
    return (control: any) => {
      if (!control.value || !deliveryDate) {
        return null; // Không validate nếu không có giá trị hoặc không có deliveryDate
      }
      
      const inputDate = new Date(control.value);
      const delivery = new Date(deliveryDate);
      
      // Reset time để so sánh chỉ ngày
      inputDate.setHours(0, 0, 0, 0);
      delivery.setHours(0, 0, 0, 0);
      
      if (isNaN(inputDate.getTime())) {
        return null; // Không validate nếu date không hợp lệ
      }
      
      // Ngày nhập vào phải nhỏ hơn ngày giao (trước ngày giao)
      if (inputDate >= delivery) {
        return { dateAfterDelivery: true };
      }
      
      return null;
    };
  }

  /**
   * Validator: Kiểm tra Ngày Bắt Đầu <= Dự Kiến Hoàn Thành
   */
  private dateBeforeExpectedFinishValidator(): any {
    return (control: any) => {
      if (!control.value) {
        return null;
      }
      
      const startDate = new Date(control.value);
      const expectedFinish = this.workItemForm?.get('expectedFinish')?.value;
      
      if (!expectedFinish) {
        return null; // Không validate nếu expectedFinish chưa có giá trị
      }
      
      const expectedDate = new Date(expectedFinish);
      
      // Reset time để so sánh chỉ ngày
      startDate.setHours(0, 0, 0, 0);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (isNaN(startDate.getTime()) || isNaN(expectedDate.getTime())) {
        return null;
      }
      
      // Ngày Bắt Đầu phải <= Dự Kiến Hoàn Thành
      if (startDate > expectedDate) {
        return { startDateAfterExpectedFinish: true };
      }
      
      return null;
    };
  }

  /**
   * Validator: Kiểm tra Dự Kiến Hoàn Thành >= Ngày Bắt Đầu
   */
  private dateAfterStartDateValidator(): any {
    return (control: any) => {
      if (!control.value) {
        return null;
      }
      
      const expectedFinish = new Date(control.value);
      const startDate = this.workItemForm?.get('startDate')?.value;
      
      if (!startDate) {
        return null; // Không validate nếu startDate chưa có giá trị
      }
      
      const start = new Date(startDate);
      
      // Reset time để so sánh chỉ ngày
      expectedFinish.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      
      if (isNaN(expectedFinish.getTime()) || isNaN(start.getTime())) {
        return null;
      }
      
      // Dự Kiến Hoàn Thành phải >= Ngày Bắt Đầu
      if (expectedFinish < start) {
        return { expectedFinishBeforeStartDate: true };
      }
      
      return null;
    };
  }

  /**
   * Validator: Kiểm tra Dự Kiến Hoàn Thành <= Hoàn Thành Thực Tế
   */
  private dateBeforeActualFinishValidator(): any {
    return (control: any) => {
      if (!control.value) {
        return null;
      }
      
      const expectedFinish = new Date(control.value);
      const actualFinish = this.workItemForm?.get('actualFinish')?.value;
      
      if (!actualFinish) {
        return null; // Không validate nếu actualFinish chưa có giá trị
      }
      
      const actual = new Date(actualFinish);
      
      // Reset time để so sánh chỉ ngày
      expectedFinish.setHours(0, 0, 0, 0);
      actual.setHours(0, 0, 0, 0);
      
      if (isNaN(expectedFinish.getTime()) || isNaN(actual.getTime())) {
        return null;
      }
      
      // Dự Kiến Hoàn Thành phải <= Hoàn Thành Thực Tế
      if (expectedFinish > actual) {
        return { expectedFinishAfterActualFinish: true };
      }
      
      return null;
    };
  }

  /**
   * Validator: Kiểm tra Hoàn Thành Thực Tế >= Dự Kiến Hoàn Thành
   */
  private dateAfterExpectedFinishValidator(): any {
    return (control: any) => {
      if (!control.value) {
        return null;
      }
      
      const actualFinish = new Date(control.value);
      const expectedFinish = this.workItemForm?.get('expectedFinish')?.value;
      
      if (!expectedFinish) {
        return null; // Không validate nếu expectedFinish chưa có giá trị
      }
      
      const expected = new Date(expectedFinish);
      
      // Reset time để so sánh chỉ ngày
      actualFinish.setHours(0, 0, 0, 0);
      expected.setHours(0, 0, 0, 0);
      
      if (isNaN(actualFinish.getTime()) || isNaN(expected.getTime())) {
        return null;
      }
      
      // Hoàn Thành Thực Tế phải >= Dự Kiến Hoàn Thành
      if (actualFinish < expected) {
        return { actualFinishBeforeExpectedFinish: true };
      }
      
      return null;
    };
  }

  /**
   * Get delivery date for display
   */
  getDeliveryDate(): Date | null {
    if (!this.workItem?.assignment?.deliveryDate) {
      return null;
    }
    
    const deliveryDate = this.workItem.assignment.deliveryDate;
    return parseDateSafe(deliveryDate);
  }

  // Helper method để parse file_ID (comma-separated string) thành array of numbers
  private parseFileIds(fileIds: string | undefined): number[] {
    if (!fileIds || !fileIds.trim()) {
      return [];
    }
    
    return fileIds.split(',')
      .map(id => id.trim())
      .filter(id => id !== '')
      .map(id => {
        const parsed = parseInt(id, 10);
        return isNaN(parsed) ? null : parsed;
      })
      .filter((id): id is number => id !== null);
  }
}

