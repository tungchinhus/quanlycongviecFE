/**
 * Enum cho User Roles
 * Đảm bảo đồng nhất giữa Frontend, Backend và Firebase Custom Claims
 * 
 * Lưu ý:
 * - Backend database có thể có "Admin" nhưng frontend dùng "Administrator"
 * - Cần normalize "Admin" -> "Administrator" khi sync từ backend
 */
export enum UserRole {
  Administrator = 'Administrator',
  Manager = 'Manager',
  User = 'User',
  Guest = 'Guest'
}

/**
 * Array chứa tất cả các roles
 * Dùng để iterate và validate
 */
export const ALL_USER_ROLES: UserRole[] = [
  UserRole.Administrator,
  UserRole.Manager,
  UserRole.User,
  UserRole.Guest
];

/**
 * Map role names từ backend (có thể có "Admin") sang enum
 * Backend có thể trả về "Admin" nhưng frontend dùng "Administrator"
 */
export function normalizeRoleName(roleName: string): UserRole | null {
  const normalized = roleName.trim();
  
  // Map "Admin" -> "Administrator" để đảm bảo consistency
  if (normalized === 'Admin' || normalized === 'admin' || normalized === 'ADMIN') {
    return UserRole.Administrator;
  }
  
  // Map các giá trị khác
  const roleMap: { [key: string]: UserRole } = {
    'Administrator': UserRole.Administrator,
    'Manager': UserRole.Manager,
    'User': UserRole.User,
    'Guest': UserRole.Guest
  };
  
  return roleMap[normalized] || null;
}

/**
 * Validate role name có hợp lệ không
 */
export function isValidRole(roleName: string): boolean {
  return normalizeRoleName(roleName) !== null;
}

/**
 * Enum cho Permissions
 * Đảm bảo đồng nhất giữa Frontend, Backend và Firebase Custom Claims
 */
export enum Permission {
  // File Management
  FileRead = 'FileRead',
  FileWrite = 'FileWrite',
  FileDelete = 'FileDelete',
  FileUpload = 'FileUpload',
  
  // User Management
  UserRead = 'UserRead',
  UserWrite = 'UserWrite',
  UserDelete = 'UserDelete',
  
  // Role Management
  RoleRead = 'RoleRead',
  RoleWrite = 'RoleWrite',
  RoleDelete = 'RoleDelete',
  
  // Permission Management
  PermissionRead = 'PermissionRead',
  PermissionWrite = 'PermissionWrite',
  PermissionDelete = 'PermissionDelete',
  
  // Work Assignment
  AssignmentRead = 'AssignmentRead',
  AssignmentWrite = 'AssignmentWrite',
  AssignmentDelete = 'AssignmentDelete',
  
  // Approval
  ApprovalRead = 'ApprovalRead',
  ApprovalWrite = 'ApprovalWrite',
  ApprovalDelete = 'ApprovalDelete',
  
  // System
  SystemConfig = 'SystemConfig',
  SystemAdmin = 'SystemAdmin'
}

/**
 * Array chứa tất cả các permissions
 * Dùng để iterate và validate
 */
export const ALL_PERMISSIONS: Permission[] = [
  Permission.FileRead,
  Permission.FileWrite,
  Permission.FileDelete,
  Permission.FileUpload,
  Permission.UserRead,
  Permission.UserWrite,
  Permission.UserDelete,
  Permission.RoleRead,
  Permission.RoleWrite,
  Permission.RoleDelete,
  Permission.PermissionRead,
  Permission.PermissionWrite,
  Permission.PermissionDelete,
  Permission.AssignmentRead,
  Permission.AssignmentWrite,
  Permission.AssignmentDelete,
  Permission.ApprovalRead,
  Permission.ApprovalWrite,
  Permission.ApprovalDelete,
  Permission.SystemConfig,
  Permission.SystemAdmin
];

/**
 * Validate permission name có hợp lệ không
 */
export function isValidPermission(permissionName: string): boolean {
  return ALL_PERMISSIONS.includes(permissionName as Permission);
}

/**
 * Map role names từ array strings sang enum array
 */
export function normalizeRoles(roles: string[]): UserRole[] {
  return roles
    .map(role => normalizeRoleName(role))
    .filter((role): role is UserRole => role !== null);
}

