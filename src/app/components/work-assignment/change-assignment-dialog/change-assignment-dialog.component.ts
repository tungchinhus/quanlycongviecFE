import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkItemService } from '../../../services/work-item.service';
import { AssignmentService } from '../../../services/assignment.service';
import { FileService } from '../../../services/file.service';
import { UsersService } from '../../../services/users.service';
import { AuthUser } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';
import { MachineAssignment, WorkItem, TechnicalSheet } from '../../../models/machine-assignment.model';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-change-assignment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './change-assignment-dialog.component.html',
  styleUrls: ['./change-assignment-dialog.component.css']
})
export class ChangeAssignmentDialogComponent implements OnInit {
  changeForm: FormGroup;
  users: AuthUser[] = [];
  isLoadingUsers = false;
  isSaving = false;
  
  // Work items cần thay đổi
  coreDesignWorkItem: WorkItem | null = null;
  casingDesignWorkItem: WorkItem | null = null;
  materialLevelingWorkItem: WorkItem | null = null;
  coreReviewWorkItem: WorkItem | null = null;
  casingReviewWorkItem: WorkItem | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ChangeAssignmentDialogComponent>,
    private workItemService: WorkItemService,
    private assignmentService: AssignmentService,
    private fileService: FileService,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: {
      assignment: MachineAssignment;
      technicalSheet: TechnicalSheet;
    }
  ) {
    this.changeForm = this.fb.group({
      coreDesignUser: [''],
      casingDesignUser: [''],
      materialLevelingUser: [''],
      coreReviewUser: [''],
      casingReviewUser: ['']
    });
  }

  ngOnInit() {
    this.loadUsers();
    this.loadWorkItems();
  }

  loadUsers() {
    this.isLoadingUsers = true;
    this.usersService.loadUsers(1, 100).subscribe({
      next: (users) => {
        // Filter users cho danh mục công việc (không có Administrator)
        this.users = users.filter(user => 
          user.isActive !== false && 
          !user.roles.includes(UserRole.Administrator)
        );
        this.isLoadingUsers = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.isLoadingUsers = false;
        this.snackBar.open('Không thể tải danh sách người dùng', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadWorkItems() {
    if (!this.data.assignment || !this.data.assignment.assignmentID) {
      return;
    }

    // Load work items từ assignment
    const assignment = this.data.assignment;
    
    if (assignment.workItems && assignment.workItems.length > 0) {
      // Tìm các work items cần thay đổi
      this.coreDesignWorkItem = assignment.workItems.find(wi => wi.workType === 'Core Design') || null;
      this.casingDesignWorkItem = assignment.workItems.find(wi => wi.workType === 'Casing Design') || null;
      this.materialLevelingWorkItem = assignment.workItems.find(wi => wi.workType === 'Material Leveling') || null;
      this.coreReviewWorkItem = assignment.workItems.find(wi => wi.workType === 'Core Review') || null;
      this.casingReviewWorkItem = assignment.workItems.find(wi => wi.workType === 'Casing Review') || null;

      // Điền form với giá trị hiện tại
      this.changeForm.patchValue({
        coreDesignUser: this.coreDesignWorkItem?.personName || '',
        casingDesignUser: this.casingDesignWorkItem?.personName || '',
        materialLevelingUser: this.materialLevelingWorkItem?.personName || '',
        coreReviewUser: this.coreReviewWorkItem?.personName || '',
        casingReviewUser: this.casingReviewWorkItem?.personName || ''
      });
    } else {
      // Nếu chưa có work items, load từ API
      this.workItemService.getWorkItemsByAssignment(assignment.assignmentID).subscribe({
        next: (workItems) => {
          this.coreDesignWorkItem = workItems.find(wi => wi.workType === 'Core Design') || null;
          this.casingDesignWorkItem = workItems.find(wi => wi.workType === 'Casing Design') || null;
          this.materialLevelingWorkItem = workItems.find(wi => wi.workType === 'Material Leveling') || null;
          this.coreReviewWorkItem = workItems.find(wi => wi.workType === 'Core Review') || null;
          this.casingReviewWorkItem = workItems.find(wi => wi.workType === 'Casing Review') || null;

          this.changeForm.patchValue({
            coreDesignUser: this.coreDesignWorkItem?.personName || '',
            casingDesignUser: this.casingDesignWorkItem?.personName || '',
            materialLevelingUser: this.materialLevelingWorkItem?.personName || '',
            coreReviewUser: this.coreReviewWorkItem?.personName || '',
            casingReviewUser: this.casingReviewWorkItem?.personName || ''
          });
        },
        error: (err) => {
          console.error('Error loading work items:', err);
        }
      });
    }
  }

  getUserDisplayName(userId: string | undefined): string {
    if (!userId) return '';
    const user = this.users.find(u => 
      u.id === userId || 
      u.id?.toString() === userId ||
      u.userId?.toString() === userId ||
      u.userName === userId ||
      u.name === userId
    );
    return user ? (user.name || user.userName || user.id?.toString() || '') : userId;
  }

  onSave() {
    if (this.changeForm.invalid) {
      return;
    }

    const formValue = this.changeForm.value;
    this.isSaving = true;

    // Lấy TBKT_ID từ assignment
    const tbktId = this.data.assignment.tbkt_ID || this.data.technicalSheet.tbkt_ID;
    if (!tbktId) {
      this.snackBar.open('Không tìm thấy TBKT ID', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      this.isSaving = false;
      return;
    }

    // Lấy tất cả assignments có cùng TBKT_ID
    this.assignmentService.getAllAssignments().pipe(
      map((allAssignments) => {
        // Filter assignments có cùng TBKT_ID
        return allAssignments.filter(a => 
          a.tbkt_ID === tbktId || 
          a.tbkt_ID === tbktId.toString() ||
          a.tbkt_ID?.toString() === tbktId.toString()
        );
      }),
      switchMap((assignments) => {
        // Lấy tất cả work items từ các assignments này
        const workItemRequests = assignments.map(assignment => 
          this.workItemService.getWorkItemsByAssignment(assignment.assignmentID).pipe(
            catchError(() => of([] as WorkItem[]))
          )
        );
        
        return forkJoin(workItemRequests).pipe(
          map((workItemArrays) => {
            // Flatten tất cả work items và trả về cùng với assignments
            return { 
              allWorkItems: workItemArrays.flat(),
              assignments: assignments
            };
          })
        );
      }),
      switchMap(({ allWorkItems, assignments }) => {
        // Tạo danh sách các work items cần cập nhật
        const workItemsToUpdate: Array<{ workItem: WorkItem; newPersonName: string; workType: string }> = [];

        // Core Design: Tìm tất cả work items có cùng personName cũ và workType = 'Core Design'
        if (this.coreDesignWorkItem && formValue.coreDesignUser) {
          const oldPersonName = this.coreDesignWorkItem.personName;
          const newPersonName = formValue.coreDesignUser.toString();
          
          if (oldPersonName && oldPersonName !== newPersonName) {
            const matchingWorkItems = allWorkItems.filter(wi => 
              wi.workType === 'Core Design' && 
              (wi.personName === oldPersonName || 
               wi.personName?.toString() === oldPersonName?.toString())
            );
            
            matchingWorkItems.forEach(wi => {
              workItemsToUpdate.push({
                workItem: wi,
                newPersonName: newPersonName,
                workType: 'Core Design'
              });
            });
          }
        }

        // Casing Design: Tìm tất cả work items có cùng personName cũ và workType = 'Casing Design'
        if (this.casingDesignWorkItem && formValue.casingDesignUser) {
          const oldPersonName = this.casingDesignWorkItem.personName;
          const newPersonName = formValue.casingDesignUser.toString();
          
          if (oldPersonName && oldPersonName !== newPersonName) {
            const matchingWorkItems = allWorkItems.filter(wi => 
              wi.workType === 'Casing Design' && 
              (wi.personName === oldPersonName || 
               wi.personName?.toString() === oldPersonName?.toString())
            );
            
            matchingWorkItems.forEach(wi => {
              workItemsToUpdate.push({
                workItem: wi,
                newPersonName: newPersonName,
                workType: 'Casing Design'
              });
            });
          }
        }

        // Material Leveling: Tìm tất cả work items có cùng personName cũ và workType = 'Material Leveling'
        if (this.materialLevelingWorkItem && formValue.materialLevelingUser) {
          const oldPersonName = this.materialLevelingWorkItem.personName;
          const newPersonName = formValue.materialLevelingUser.toString();
          
          if (oldPersonName && oldPersonName !== newPersonName) {
            const matchingWorkItems = allWorkItems.filter(wi => 
              wi.workType === 'Material Leveling' && 
              (wi.personName === oldPersonName || 
               wi.personName?.toString() === oldPersonName?.toString())
            );
            
            matchingWorkItems.forEach(wi => {
              workItemsToUpdate.push({
                workItem: wi,
                newPersonName: newPersonName,
                workType: 'Material Leveling'
              });
            });
          }
        }

        // Core Review: Tìm tất cả work items có cùng personName cũ và workType = 'Core Review'
        if (this.coreReviewWorkItem && formValue.coreReviewUser) {
          const oldPersonName = this.coreReviewWorkItem.personName;
          const newPersonName = formValue.coreReviewUser.toString();
          
          if (oldPersonName && oldPersonName !== newPersonName) {
            const matchingWorkItems = allWorkItems.filter(wi => 
              wi.workType === 'Core Review' && 
              (wi.personName === oldPersonName || 
               wi.personName?.toString() === oldPersonName?.toString())
            );
            
            matchingWorkItems.forEach(wi => {
              workItemsToUpdate.push({
                workItem: wi,
                newPersonName: newPersonName,
                workType: 'Core Review'
              });
            });
          }
        }

        // Casing Review: Tìm tất cả work items có cùng personName cũ và workType = 'Casing Review'
        if (this.casingReviewWorkItem && formValue.casingReviewUser) {
          const oldPersonName = this.casingReviewWorkItem.personName;
          const newPersonName = formValue.casingReviewUser.toString();
          
          if (oldPersonName && oldPersonName !== newPersonName) {
            const matchingWorkItems = allWorkItems.filter(wi => 
              wi.workType === 'Casing Review' && 
              (wi.personName === oldPersonName || 
               wi.personName?.toString() === oldPersonName?.toString())
            );
            
            matchingWorkItems.forEach(wi => {
              workItemsToUpdate.push({
                workItem: wi,
                newPersonName: newPersonName,
                workType: 'Casing Review'
              });
            });
          }
        }

        // Tạo map oldPersonName -> newPersonName để update files
        const personNameMapping = new Map<string, string>(); // Map oldPersonName -> newPersonName
        
        workItemsToUpdate.forEach(({ workItem, newPersonName }) => {
          const oldPersonName = workItem.personName;
          if (oldPersonName && oldPersonName !== newPersonName) {
            // Lưu mapping: nếu có nhiều work items cùng oldPersonName, dùng newPersonName mới nhất
            personNameMapping.set(oldPersonName.toString(), newPersonName);
          }
        });

        // Tạo observables để update tất cả work items
        const updateObservables = workItemsToUpdate.map(({ workItem, newPersonName }) =>
          this.workItemService.updateWorkItem(workItem.workItemID, { 
            personName: newPersonName 
          }).pipe(
            catchError(err => {
              console.error(`Error updating work item ${workItem.workItemID}:`, err);
              return of(null);
            })
          )
        );

        if (updateObservables.length === 0) {
          return of({ successCount: 0, failCount: 0, totalCount: 0, filesUpdated: 0 });
        }

        return forkJoin(updateObservables).pipe(
          switchMap((results) => {
            const successCount = results.filter(r => r !== null).length;
            const failCount = results.length - successCount;
            
            // Lấy tất cả files của assignment để update UploadedBy và File_ID
            // Không chỉ files trong File_ID, mà tất cả files của assignment
            if (personNameMapping.size > 0 && assignments.length > 0) {
              // Lấy tất cả assignment IDs
              const assignmentIds = assignments.map((a: MachineAssignment) => a.assignmentID || (a as any).assignmentId).filter((id: any): id is number => !!id);
              
              // Lấy tất cả files của các assignments này
              const fileRequests = assignmentIds.map((assignmentId: number) =>
                this.fileService.getFilesByAssignment(assignmentId).pipe(
                  catchError(() => of([]))
                )
              );
              
              return forkJoin(fileRequests).pipe(
                switchMap((fileArrays: any[]) => {
                  const allFiles = (fileArrays as any[]).flat();
                  
                  // Tìm files cần update: files có UploadedBy match với oldPersonName hoặc các identifiers của oldPersonName
                  // Cần tìm user từ oldPersonName để lấy tất cả identifiers có thể
                  const filesToUpdate: Array<{ fileId: number; newPersonName: string }> = [];
                  
                  // Tạo map oldPersonName -> list of identifiers (ID, userName, name, email, etc)
                  const oldPersonNameIdentifiersMap = new Map<string, string[]>();
                  personNameMapping.forEach((newPersonName, oldPersonName) => {
                    const identifiers = [oldPersonName.toString()];
                    // Tìm user từ oldPersonName trong danh sách users để lấy thêm identifiers
                    const oldUser = this.users.find(u => 
                      u.id === oldPersonName ||
                      u.id?.toString() === oldPersonName ||
                      u.userId?.toString() === oldPersonName ||
                      u.userName === oldPersonName ||
                      u.name === oldPersonName ||
                      u.email === oldPersonName
                    );
                    
                    if (oldUser) {
                      if (oldUser.userName) identifiers.push(oldUser.userName);
                      if (oldUser.name) identifiers.push(oldUser.name);
                      if (oldUser.email) identifiers.push(oldUser.email);
                      if (oldUser.id) identifiers.push(oldUser.id.toString());
                      if (oldUser.userId) identifiers.push(oldUser.userId.toString());
                      if (oldUser.firebaseUid) identifiers.push(oldUser.firebaseUid);
                    }
                    
                    oldPersonNameIdentifiersMap.set(oldPersonName, identifiers);
                  });
                  
                  allFiles.forEach((file: any) => {
                    const uploadedBy = file.uploadedBy || file.uploadBy;
                    if (uploadedBy) {
                      // Kiểm tra xem uploadedBy có match với bất kỳ identifier nào của oldPersonName không
                      personNameMapping.forEach((newPersonName, oldPersonName) => {
                        const oldIdentifiers = oldPersonNameIdentifiersMap.get(oldPersonName) || [];
                        const isMatch = oldIdentifiers.some(id => 
                          id && uploadedBy && id.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
                        );
                        
                        if (isMatch) {
                          const fileId = file.id || file.fileID;
                          if (fileId) {
                            filesToUpdate.push({ fileId, newPersonName });
                          }
                        }
                      });
                    }
                  });
                  
                  // Update UploadedBy cho tất cả files
                  if (filesToUpdate.length > 0) {
                    // Loại bỏ duplicate (cùng fileId)
                    const uniqueFilesToUpdate = new Map<number, string>();
                    filesToUpdate.forEach(({ fileId, newPersonName }) => {
                      uniqueFilesToUpdate.set(fileId, newPersonName);
                    });
                    
                    const fileUpdateObservables = Array.from(uniqueFilesToUpdate.entries()).map(([fileId, newPersonName]) =>
                      this.fileService.updateFile(fileId, { 
                        uploadedBy: newPersonName 
                      } as Partial<{ uploadedBy: string }>).pipe(
                        catchError(err => {
                          console.error(`Error updating file ${fileId} UploadedBy:`, err);
                          return of(null);
                        })
                      )
                    );
                    
                    return forkJoin(fileUpdateObservables).pipe(
                      switchMap((fileResults) => {
                        const filesUpdated = fileResults.filter(r => r !== null).length;
                        
                        // Sau khi update UploadedBy của files, cần update File_ID của work items
                        // để chứa tất cả file IDs liên quan
                        // Reload work items từ assignments để lấy PersonName mới sau khi update
                        const workItemRequests = assignments.map((assignment: MachineAssignment) =>
                          this.workItemService.getWorkItemsByAssignment(assignment.assignmentID || (assignment as any).assignmentId).pipe(
                            catchError(() => of([] as WorkItem[]))
                          )
                        );
                        
                        return forkJoin(workItemRequests).pipe(
                          switchMap((workItemArrays: WorkItem[][]) => {
                            const reloadedWorkItems = workItemArrays.flat();
                            const workItemFileIdMap = new Map<number, number[]>(); // Map workItemID -> fileIds[]
                            
                            // Nhóm files theo work item (dựa trên PersonName mới)
                            personNameMapping.forEach((newPersonName, oldPersonName) => {
                              // Tìm work items có PersonName = newPersonName (sau khi đã update)
                              const updatedWorkItems = reloadedWorkItems.filter(wi => 
                                wi.personName && wi.personName.toString().toLowerCase() === newPersonName.toString().toLowerCase()
                              );
                              
                              // Tìm files có UploadedBy = newPersonName (sau khi đã update)
                              const relatedFileIds = allFiles
                                .filter((file: any) => {
                                  const uploadedBy = file.uploadedBy || file.uploadBy;
                                  return uploadedBy && uploadedBy.toString().toLowerCase() === newPersonName.toString().toLowerCase();
                                })
                                .map((file: any) => file.id || file.fileID)
                                .filter((id: any): id is number => !!id);
                              
                              // Gán file IDs cho các work items
                              updatedWorkItems.forEach(workItem => {
                                const existingFileIds = workItemFileIdMap.get(workItem.workItemID) || [];
                                workItemFileIdMap.set(workItem.workItemID, [...existingFileIds, ...relatedFileIds]);
                              });
                            });
                            
                            // Update File_ID cho các work items
                            if (workItemFileIdMap.size > 0) {
                              const workItemUpdateObservables = Array.from(workItemFileIdMap.entries()).map(([workItemId, fileIds]) => {
                                // Loại bỏ duplicate và sort
                                const uniqueFileIds = Array.from(new Set(fileIds)).sort((a, b) => a - b);
                                const fileIdString = uniqueFileIds.join(',');
                                
                                return this.workItemService.updateWorkItem(workItemId, { 
                                  file_ID: fileIdString 
                                } as Partial<{ file_ID: string }>).pipe(
                                  catchError(err => {
                                    console.error(`Error updating File_ID for work item ${workItemId}:`, err);
                                    return of(null);
                                  })
                                );
                              });
                              
                              return forkJoin(workItemUpdateObservables).pipe(
                                map(() => ({ successCount, failCount, totalCount: results.length, filesUpdated }))
                              );
                            }
                            
                            return of({ successCount, failCount, totalCount: results.length, filesUpdated });
                          })
                        );
                      })
                    );
                  }
                  
                  return of({ successCount, failCount, totalCount: results.length, filesUpdated: 0 });
                })
              );
            }
            
            return of({ successCount, failCount, totalCount: results.length, filesUpdated: 0 });
          })
        );
      })
    ).subscribe({
      next: ({ successCount, failCount, totalCount, filesUpdated }) => {
        if (totalCount === 0) {
          this.snackBar.open('Không có công việc nào để cập nhật', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['info-snackbar']
          });
        } else if (failCount === 0) {
          const message = filesUpdated > 0 
            ? `Thay đổi giao việc thành công! Đã chuyển ${successCount} công việc và ${filesUpdated} file từ người cũ sang người mới.`
            : `Thay đổi giao việc thành công! Đã chuyển ${successCount} công việc từ người cũ sang người mới.`;
          this.snackBar.open(message, 'Đóng', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.dialogRef.close(true);
        } else {
          this.snackBar.open(`Đã cập nhật ${successCount}/${totalCount} công việc, ${failCount} công việc gặp lỗi.`, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['warning-snackbar']
          });
          this.dialogRef.close(true);
        }
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error transferring work items:', err);
        this.snackBar.open('Có lỗi xảy ra khi thay đổi giao việc. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isSaving = false;
      }
    });
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

  onCancel() {
    this.dialogRef.close(false);
  }
}
