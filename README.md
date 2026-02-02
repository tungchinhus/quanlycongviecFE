# Quản Lý File & Công Việc (quanlyfileFE)

Dự án Angular quản lý file và công việc với tính năng gán công việc và ký duyệt.

## Công Nghệ Sử Dụng

- **Angular**: v20.1.0
- **Angular CLI**: v20.1.5
- **Angular Material**: v20.2.2 (Material Design 3)
- **RxJS**: ~7.8.0
- **Zone.js**: ~0.15.0

## Cài Đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy development server:
```bash
npm start
```

3. Build production:
```bash
npm run build:prod
```

## Chạy local (Development)

Frontend gọi API tại `http://localhost:5000/api` (xem `src/environments/environment.ts`). Nếu gặp lỗi **"Không thể kết nối đến server"** hoặc **ERR_CONNECTION_REFUSED**:

1. **Khởi động API backend trước** (thư mục `quanlyfilesBE`):
   ```bash
   cd quanlyfilesBE
   dotnet run
   ```
   Hoặc mở solution trong Visual Studio và chạy với profile **http** (listen tại `http://localhost:5000`).

2. Sau đó chạy frontend: `npm start`.

3. Nếu backend chạy ở địa chỉ/port khác, sửa `apiUrl` trong `src/environments/environment.ts`.

## Tính Năng

### Quản Lý File
- Upload file
- Xem danh sách file
- Tải xuống file
- Xóa file
- Lọc theo trạng thái

### Gán Công Việc
- Tạo gán công việc mới
- Xem chi tiết gán công việc
- Quản lý bản vẽ kỹ thuật
- Xem danh sách công việc và ký duyệt liên quan

### Ký Duyệt
- Tạo ký duyệt mới
- Xem danh sách ký duyệt
- Xóa ký duyệt

### Công Việc
- Tạo công việc mới
- Xem danh sách công việc
- Quản lý trạng thái công việc

## Cấu Trúc Dự Án

```
src/
├── app/
│   ├── components/
│   │   ├── file-management/      # Quản lý file
│   │   ├── work-assignment/       # Gán công việc
│   │   ├── approval/              # Ký duyệt
│   │   └── work-item/             # Công việc
│   ├── models/                    # Models/Interfaces
│   ├── services/                  # Services
│   ├── app.component.ts           # Component chính
│   └── app.routes.ts              # Routing
├── custom-theme.scss              # Material Design 3 theme
└── styles.css                     # Custom styles
```

## API Endpoints

Các services đang sử dụng các endpoints sau (cần cấu hình trong môi trường production):

- `api/files` - Quản lý file
- `api/assignments` - Gán công việc
- `api/approvals` - Ký duyệt
- `api/work-items` - Công việc
- `api/technical-sheets` - Bản vẽ kỹ thuật
- `api/work-changes` - Thay đổi công việc

## Database Schema

Dự án dựa trên schema với các bảng chính:
- `MachineAssignment` - Gán công việc
- `AssignmentApproval` - Ký duyệt
- `TechnicalSheet` - Bản vẽ kỹ thuật
- `WorkItem` - Công việc
- `WorkChange` - Thay đổi công việc

## Lưu Ý

- Cần cấu hình API backend endpoint trong các services
- Fonts: Inter, Noto Sans (Google Fonts)
- Icons: Material Icons (Google Material Icons)
- Theme: Material Design 3 với palette Azure (primary) và Blue (tertiary)

