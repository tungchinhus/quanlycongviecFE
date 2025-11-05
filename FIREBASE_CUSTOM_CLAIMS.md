# Firebase Custom Claims - Hướng dẫn Backend Implementation

## Tổng quan

Hệ thống sử dụng Firebase Custom Claims để quản lý phân quyền user. Custom claims được lưu trực tiếp trong Firebase ID token và được đọc từ client.

## Kiến trúc

1. **Frontend**: Đọc roles từ Firebase custom claims (ID token)
2. **Backend**: Set custom claims sử dụng Firebase Admin SDK
3. **Local DB**: Lưu thông tin user để quản lý và đồng bộ

## Backend API Endpoints cần implement

### 1. POST `/api/users`
Tạo user mới trên Firebase Authentication và set custom claims

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "password123",
  "roles": ["User"]
}
```

**Backend Logic:**
```javascript
// 1. Tạo user trên Firebase Authentication
const userRecord = await admin.auth().createUser({
  email: userData.email,
  password: userData.password,
  displayName: userData.name
});

// 2. Set custom claims
await admin.auth().setCustomUserClaims(userRecord.uid, {
  roles: userData.roles,
  name: userData.name
});

// 3. Tạo user trong local DB
const localUser = await db.users.create({
  firebaseUid: userRecord.uid,
  name: userData.name,
  email: userData.email,
  roles: userData.roles
});

return localUser;
```

### 2. PUT `/api/users/:userId/roles`
Cập nhật roles của user và set custom claims

**Request Body:**
```json
{
  "roles": ["Administrator", "Manager"]
}
```

**Backend Logic:**
```javascript
// 1. Lấy user từ DB để có firebaseUid
const user = await db.users.findById(userId);

// 2. Cập nhật roles trong DB
const updatedUser = await db.users.update(userId, { roles: userData.roles });

// 3. Set custom claims trên Firebase
await admin.auth().setCustomUserClaims(user.firebaseUid, {
  roles: userData.roles,
  name: user.name
});

return updatedUser;
```

### 3. POST `/api/users/:firebaseUid/set-custom-claims`
Set custom claims trực tiếp cho user (sử dụng firebaseUid)

**Request Body:**
```json
{
  "roles": ["Administrator", "Manager"],
  "name": "Nguyễn Văn A"
}
```

**Backend Logic:**
```javascript
// Set custom claims trên Firebase
await admin.auth().setCustomUserClaims(firebaseUid, {
  roles: claims.roles,
  name: claims.name || undefined
});

return { success: true };
```

### 4. GET `/api/users/by-firebase-uid/:firebaseUid`
Lấy thông tin user từ local DB (fallback)

**Response:**
```json
{
  "id": "user-id",
  "firebaseUid": "firebase-uid",
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "roles": ["User"]
}
```

### 5. GET `/api/users/by-username/:username`
Lấy email từ username (dùng cho đăng nhập bằng username)

**Response:**
```json
{
  "email": "user@example.com"
}
```

**Backend Logic:**
```javascript
// Tìm user theo username trong DB
const user = await db.users.findOne({ username: username });
if (!user) {
  return res.status(404).json({ message: 'Username not found' });
}
return res.json({ email: user.email });
```

### 6. PUT `/api/users/by-firebase-uid/:firebaseUid`
Cập nhật hoặc tạo user trong local DB (đồng bộ từ Firebase)

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "roles": ["User"]
}
```

## Custom Claims Structure

```javascript
{
  "roles": ["Administrator", "Manager", "User", "Guest"], // Array of roles
  "name": "Nguyễn Văn A" // Optional: User's display name
}
```

## Lưu ý quan trọng

1. **Custom Claims không tự động refresh**: Khi set custom claims, user cần refresh ID token để lấy claims mới. Frontend sẽ tự động refresh khi cần.

2. **Token caching**: Firebase client SDK cache ID token. Khi custom claims thay đổi, user cần:
   - Gọi `getIdToken(true)` để force refresh token
   - Hoặc đăng xuất và đăng nhập lại

3. **Security Rules**: Có thể sử dụng custom claims trong Firebase Security Rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null && 
           (request.auth.uid == userId || 
            'Administrator' in request.auth.token.roles);
       }
     }
   }
   ```

4. **Size limit**: Custom claims có giới hạn 1000 bytes. Không nên lưu quá nhiều thông tin.

## Workflow

### Khi tạo user mới:
1. Frontend gọi `POST /api/users`
2. Backend tạo user trên Firebase Authentication
3. Backend set custom claims với roles
4. Backend tạo user trong local DB
5. Frontend đăng nhập user và đọc custom claims từ token

### Khi cập nhật roles:
1. Frontend gọi `PUT /api/users/:userId/roles`
2. Backend cập nhật roles trong DB
3. Backend set custom claims mới
4. Frontend gọi `POST /api/users/:firebaseUid/set-custom-claims` để đảm bảo
5. Frontend refresh token để lấy claims mới (nếu là user hiện tại)

### Khi đăng nhập:
1. User đăng nhập qua Firebase Authentication
2. Frontend đọc custom claims từ ID token
3. Nếu không có claims, fallback về local DB
4. Đồng bộ thông tin lên local DB (nếu cần)

## Testing

Để test custom claims:

1. Set custom claims cho test user:
```javascript
await admin.auth().setCustomUserClaims('test-user-uid', {
  roles: ['Administrator']
});
```

2. User cần refresh token:
```javascript
// Frontend
await firebaseUser.getIdToken(true);
```

3. Verify claims:
```javascript
const tokenResult = await getIdTokenResult(firebaseUser);
console.log(tokenResult.claims.roles); // ['Administrator']
```

