import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { ApprovalWorkflowService } from '../../../services/approval-workflow.service';
import { CreateApprovalWorkflowDto } from '../../../models/approval-workflow.model';
import { UsersService } from '../../../services/users.service';
import { AuthUser } from '../../../services/auth.service';

@Component({
  selector: 'app-approval-workflow-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule
  ],
  templateUrl: './approval-workflow-dialog.component.html',
  styleUrls: ['./approval-workflow-dialog.component.css']
})
export class ApprovalWorkflowDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workflowService = inject(ApprovalWorkflowService);
  private readonly usersService = inject(UsersService);

  workflowForm: FormGroup;
  users: AuthUser[] = [];
  
  // Danh sách loại yêu cầu
  requestTypes = [
    { value: 'TechnicalSheet', label: 'Technical Sheet (TBKT)' },
    { value: 'Assignment', label: 'Phân Công Công Việc' },
    { value: 'WorkItem', label: 'Work Item' },
    { value: 'File', label: 'File/Tài Liệu' },
    { value: 'Other', label: 'Khác' }
  ];

  constructor(
    public dialogRef: MatDialogRef<ApprovalWorkflowDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.workflowForm = this.fb.group({
      requestTitle: ['', Validators.required],
      requestType: ['', Validators.required],
      requestReferenceID: [''],
      controllerEmails: [[], [Validators.required, this.arrayNotEmptyValidator.bind(this)]],
      approverEmails: [[], [Validators.required, this.arrayNotEmptyValidator.bind(this)]],
      requestDescription: ['']
    });
  }

  ngOnInit() {
    // Load users để có thể chọn email (chỉ lấy users có email)
    this.usersService.loadAllUsers().subscribe({
      next: (users) => {
        // Chỉ lấy users có email và đang active
        this.users = users.filter(user => 
          user.email && 
          user.email.trim() !== '' && 
          user.isActive !== false
        );
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.users = [];
      }
    });

    // Theo dõi thay đổi của requestType để cập nhật field mã tham chiếu
    this.workflowForm.get('requestType')?.valueChanges.subscribe(value => {
      const referenceField = this.workflowForm.get('requestReferenceID');
      if (value === 'File') {
        // Khi chọn File, xóa giá trị cũ và thêm validation cho OneDrive URL
        referenceField?.setValue('');
        referenceField?.setValidators([this.oneDriveUrlValidator.bind(this)]);
      } else {
        // Khi không phải File, xóa validation
        referenceField?.clearValidators();
      }
      referenceField?.updateValueAndValidity();
    });
  }

  // Getter để kiểm tra xem có phải loại File không
  get isFileType(): boolean {
    return this.workflowForm.get('requestType')?.value === 'File';
  }

  // Mở OneDrive picker (nếu có tích hợp OneDrive API)
  openOneDrivePicker(): void {
    // TODO: Tích hợp OneDrive Picker API
    // Hiện tại chỉ hiển thị hướng dẫn
    const oneDriveUrl = prompt(
      'Nhập đường dẫn OneDrive của file:\n\n' +
      'Ví dụ:\n' +
      'https://onedrive.live.com/...\n' +
      'hoặc\n' +
      'https://[tenant].sharepoint.com/...\n\n' +
      'Bạn có thể copy đường dẫn từ OneDrive/SharePoint và paste vào đây.'
    );
    
    if (oneDriveUrl) {
      this.workflowForm.get('requestReferenceID')?.setValue(oneDriveUrl);
    }
  }

  // Copy đường dẫn OneDrive từ clipboard
  async pasteOneDriveUrl(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes('onedrive') || text.includes('sharepoint'))) {
        this.workflowForm.get('requestReferenceID')?.setValue(text);
      } else {
        alert('Vui lòng copy đường dẫn OneDrive/SharePoint trước khi paste.');
      }
    } catch (err) {
      console.error('Error reading clipboard:', err);
      alert('Không thể đọc clipboard. Vui lòng paste thủ công.');
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.workflowForm.valid) {
      const formValue = this.workflowForm.value;
      
      // Lấy email đầu tiên từ danh sách đã chọn (backend hiện tại chỉ hỗ trợ 1 email)
      // Có thể mở rộng sau để hỗ trợ multiple emails
      const controllerEmail = Array.isArray(formValue.controllerEmails) && formValue.controllerEmails.length > 0
        ? formValue.controllerEmails[0]
        : '';
      const approverEmail = Array.isArray(formValue.approverEmails) && formValue.approverEmails.length > 0
        ? formValue.approverEmails[0]
        : '';
      
      const dto: CreateApprovalWorkflowDto = {
        requestTitle: formValue.requestTitle,
        requestDescription: formValue.requestDescription,
        requestType: formValue.requestType,
        requestReferenceID: formValue.requestReferenceID,
        controllerEmail: controllerEmail,
        approverEmail: approverEmail
      };

      this.workflowService.createWorkflow(dto).subscribe({
        next: (workflow) => {
          this.dialogRef.close(workflow);
        },
        error: (err) => {
          console.error('Error creating workflow:', err);
          alert('Không thể tạo quy trình ký duyệt. Vui lòng thử lại.');
        }
      });
    }
  }

  // Helper để hiển thị tên user trong select
  getUserDisplayName(user: AuthUser): string {
    return user.name || user.userName || user.email || '';
  }

  // Helper để lấy email từ user
  getUserEmail(user: AuthUser): string {
    return user.email || '';
  }

  // Custom validator để kiểm tra array không rỗng
  private arrayNotEmptyValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { arrayNotEmpty: true };
    }
    return null;
  }

  // Custom validator để kiểm tra OneDrive URL (chỉ validate khi là File type)
  private oneDriveUrlValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    const requestType = this.workflowForm.get('requestType')?.value;
    
    // Chỉ validate khi là File type và có giá trị
    if (requestType === 'File' && value && value.trim() !== '') {
      const oneDrivePattern = /(onedrive|sharepoint)\.(live|com|microsoft)/i;
      if (!oneDrivePattern.test(value)) {
        return { invalidOneDriveUrl: true };
      }
    }
    return null;
  }
}

