# Firebase User Management Flow - Frontend Implementation

## Tổng quan

Frontend quản lý users và roles theo kiến trúc Firebase-First:
- **Firebase Authentication**: Source of truth cho user authentication
- **Firebase Custom Claims**: Source of truth cho roles
- **Local DB**: Lưu thông tin bổ sung và sync với Firebase

## Flow chi tiết

### 1. Load Users List

```
UsersPage.ngOnInit()
  ↓
UsersService.loadUsers()
  ↓
GET /api/users (Backend)
  ↓
Backend trả về users từ Local DB (đã sync với Firebase)
  ↓
UsersService.mapUserDtoToAuthUser()
  - Normalize roles: luôn đảm bảo là array
  - Handle null/undefined roles
  ↓
Display trong UserListComponent
```

### 2. Tạo User mới

```
User clicks "Thêm người dùng"
  ↓
UserFormDialogComponent opens
  ↓
User fills form: name, email, password, roles
  ↓
UserFormDialogComponent.onSubmit()
  ↓
UsersService.createUser()
  ↓
POST /api/users/firebase
  ↓
Backend:
  1. Tạo user trên Firebase Authentication
  2. Set Custom Claims với roles
  3. Tạo user trong Local DB
  ↓
Response: UserDto với firebaseUID và roles
  ↓
UsersService updates local signal
  ↓
UserListComponent reloads users
```

### 3. Cập nhật Roles

```
User clicks checkbox trong RoleManagementComponent
  ↓
RoleManagementComponent.onToggleRole()
  ↓
UsersService.updateUserRoles(userId, newRoles)
  ↓
PUT /api/users/{userId}/roles
  ↓
Backend:
  1. Update roles trong Local DB
  2. Set Custom Claims mới trên Firebase
  ↓
Response: Updated UserDto
  ↓
UsersService.setCustomClaims() (đảm bảo Firebase có claims mới)
  ↓
AuthService.refreshUserClaims() (nếu là current user)
  ↓
RoleManagementComponent.onRoleUpdated()
  ↓
UsersPage.onRoleUpdated()
  ↓
Reload users list
```

### 4. Cập nhật User Info

```
User clicks "Edit" button
  ↓
UserFormDialogComponent opens với user data
  ↓
User updates name, roles
  ↓
UserFormDialogComponent.onSubmit()
  ↓
Check if roles changed:
  - If yes: Update user info + Update roles separately
  - If no: Update user info only
  ↓
UsersService.updateUser() + UsersService.updateUserRoles()
  ↓
Backend updates Local DB + Firebase Custom Claims
  ↓
Response: Updated UserDto
  ↓
Reload users list
```

## Code Implementation

### UsersService.loadUsers()

```typescript
loadUsers(): Observable<AuthUser[]> {
  return this.http.get<UsersResponse>(`${environment.apiUrl}/users`).pipe(
    map(response => {
      // Map UserDto sang AuthUser
      return response.data.map(dto => this.mapUserDtoToAuthUser(dto));
    }),
    map(users => {
      // Ensure roles array is always present
      return users.map(user => ({
        ...user,
        roles: user.roles && user.roles.length > 0 ? user.roles : []
      }));
    }),
    tap(users => this.usersSignal.set(users))
  );
}
```

### UsersService.mapUserDtoToAuthUser()

```typescript
private mapUserDtoToAuthUser(dto: UserDto): AuthUser {
  // Normalize roles - đảm bảo luôn là array
  let roles: UserRole[] = [];
  if (dto.roles) {
    if (Array.isArray(dto.roles)) {
      roles = dto.roles.filter(r => r) as UserRole[];
    } else if (typeof dto.roles === 'string') {
      // Parse JSON string hoặc split bằng comma
      try {
        roles = JSON.parse(dto.roles) as UserRole[];
      } catch {
        roles = dto.roles.split(',').map(r => r.trim()) as UserRole[];
      }
    }
  }
  
  return {
    id: dto.userId.toString(),
    userId: dto.userId,
    firebaseUid: dto.firebaseUID || '',
    userName: dto.userName,
    name: dto.fullName || dto.userName || '',
    email: dto.email || '',
    roles: roles, // Luôn là array, có thể rỗng
    isActive: dto.isActive,
    createdAt: dto.createdAt
  };
}
```

### RoleManagementComponent.onToggleRole()

```typescript
onToggleRole(role: UserRole, checked: boolean): void {
  // Validate permissions
  if (!this.isAdmin()) {
    this.snackBar.open('Chỉ Administrator mới có thể thay đổi quyền.');
    return;
  }

  const user = this.user();
  const newRoles = /* calculate new roles */;

  // Update roles
  this.usersService.updateUserRoles(user.id, newRoles).subscribe({
    next: (updatedUser) => {
      // Set custom claims trên Firebase
      this.usersService.setCustomClaims(user.firebaseUid, { roles: newRoles }).subscribe({
        next: () => {
          // Refresh token nếu là current user
          if (currentUser.firebaseUid === user.firebaseUid) {
            this.authService.refreshUserClaims().subscribe();
          }
          
          this.onRoleUpdated.emit();
        }
      });
    }
  });
}
```

## Xử lý Edge Cases

### 1. User không có roles

```typescript
// Trong mapUserDtoToAuthUser()
roles: roles.length > 0 ? roles : [] // Luôn là array, không null

// Trong template
@if (user.roles.length === 0) {
  <span class="no-role">Không có quyền</span>
}
```

### 2. Roles từ backend là string thay vì array

```typescript
// Normalize trong mapUserDtoToAuthUser()
if (typeof dto.roles === 'string') {
  try {
    roles = JSON.parse(dto.roles) as UserRole[];
  } catch {
    roles = dto.roles.split(',').map(r => r.trim()) as UserRole[];
  }
}
```

### 3. Firebase Custom Claims chưa được set

```typescript
// Backend sẽ tự động set Custom Claims khi:
// - Tạo user mới qua POST /api/users/firebase
// - Cập nhật roles qua PUT /api/users/{userId}/roles

// Frontend đảm bảo bằng cách gọi setCustomClaims() sau khi update roles
```

### 4. Sync giữa Firebase và Local DB

```typescript
// AuthService tự động sync khi user login
private syncUserToLocalDB(authUser: AuthUser): Observable<AuthUser> {
  return this.http.put(`/api/users/by-firebase-uid/${authUser.firebaseUid}`, {
    name: authUser.name,
    email: authUser.email,
    roles: authUser.roles
  }).pipe(
    catchError((error) => {
      // Nếu user chưa tồn tại, tạo mới
      if (error.status === 404) {
        return this.http.post(`/api/users/firebase`, {
          name: authUser.name,
          email: authUser.email,
          password: '', // Không có password khi sync
          roles: authUser.roles
        });
      }
      throw error;
    })
  );
}
```

## Best Practices

1. **Luôn normalize roles**: Đảm bảo roles luôn là array, không null/undefined
2. **Firebase là source of truth**: Khi có conflict, ưu tiên Firebase Custom Claims
3. **Sync sau mỗi thay đổi**: Đảm bảo Local DB sync với Firebase
4. **Refresh token khi cần**: User cần refresh token để nhận Custom Claims mới
5. **Error handling**: Xử lý lỗi gracefully, không crash app

## Troubleshooting

### User hiển thị "Không có quyền"
- Kiểm tra Custom Claims đã được set trên Firebase chưa
- Kiểm tra backend có sync roles từ Firebase về Local DB không
- Kiểm tra mapUserDtoToAuthUser() có normalize roles đúng không

### Roles không cập nhật
- Kiểm tra backend có set Custom Claims trên Firebase không
- User cần refresh token: `authService.refreshUserClaims()`
- Hoặc đăng xuất và đăng nhập lại

### User không hiển thị trong list
- Kiểm tra user có được tạo trong Local DB không
- Kiểm tra API endpoint `/api/users` có trả về user không
- Kiểm tra pagination/search parameters

