# Hướng dẫn tích hợp Frontend với Backend API Excel Chart

## Tổng quan

Frontend đã được tích hợp để gọi backend API `/api/ExcelExport/export-excel-with-chart` để xuất file Excel với chart được giữ nguyên.

## Cấu hình

### 1. Environment Configuration

Đảm bảo `environment.ts` và `environment.prod.ts` có cấu hình API URL đúng:

```typescript
// src/environments/environment.ts (Development)
export const environment = {
  apiUrl: 'http://localhost:5000/api' // Điều chỉnh theo URL API local
};

// src/environments/environment.prod.ts (Production)
export const environment = {
  apiUrl: 'http://172.20.115.40:8080/api' // Điều chỉnh theo URL API production
};
```

### 2. HttpClient Configuration

HttpClient đã được cấu hình trong `app.config.ts`:

```typescript
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideHttpClient(), // Cần thiết cho HttpClient
    // ...
  ]
};
```

## Cách hoạt động

### Flow xử lý:

1. **Frontend tính toán dữ liệu thống kê:**
   - Lọc và nhóm dữ liệu theo Công suất và TBKT
   - Tính toán các giá trị thống kê (max, TB, min, δ) cho từng nhóm
   - Sắp xếp dữ liệu theo công suất và TBKT

2. **Gọi Backend API:**
   - Endpoint: `POST /api/ExcelExport/export-excel-with-chart`
   - Headers:
     - `Content-Type: application/json`
     - `Authorization: Bearer <token>` (nếu có)
   - Body:
     ```json
     {
       "statisticsData": [
         {
           "congSuat": "250",
           "tbkt": "20161B",
           "soMau": 78,
           "pkH1Max": 2543,
           "pkH1TB": 2465.38,
           "pkH1Min": 2413,
           "pkH1Delta": 24.56,
           "pkH2Max": null,
           "pkH2TB": null,
           "pkH2Min": null,
           "pkH2Delta": null,
           "ukH1Max": 4.24,
           "ukH1TB": 4.13,
           "ukH1Min": 4.01,
           "ukH1Delta": 0.06,
           "ukH2Max": null,
           "ukH2TB": null,
           "ukH2Min": null,
           "ukH2Delta": null
         }
         // ... more rows
       ]
     }
     ```

3. **Backend xử lý:**
   - Load template Excel từ `assets/thongke_template.xlsx`
   - Clear dữ liệu cũ từ dòng 4 trở đi
   - Ghi dữ liệu mới vào các cells
   - Merge cells cho cột "Công suất" theo nhóm
   - Giữ nguyên chart trong template
   - Trả về file Excel

4. **Frontend nhận và download file:**
   - Nhận file Excel dưới dạng Blob
   - Lấy tên file từ header `Content-Disposition` hoặc tạo tên mặc định
   - Tự động download file

## Error Handling

### Fallback Mechanism

Nếu backend API không khả dụng, frontend sẽ:
- Hiển thị thông báo cảnh báo
- Có thể thêm fallback code để xử lý trực tiếp (tùy chọn)

### Error Messages

- **Backend API error:** Hiển thị lỗi từ backend với status code và message
- **Network error:** Hiển thị thông báo lỗi kết nối
- **Timeout:** Có thể thêm timeout handling nếu cần

## Testing

### 1. Kiểm tra Backend API

```bash
# Test API endpoint
curl -X POST http://localhost:5000/api/ExcelExport/export-excel-with-chart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "statisticsData": [
      {
        "congSuat": "250",
        "tbkt": "20161B",
        "soMau": 78,
        "pkH1Max": 2543,
        "pkH1TB": 2465.38,
        "pkH1Min": 2413,
        "pkH1Delta": 24.56
      }
    ]
  }' \
  --output test.xlsx
```

### 2. Kiểm tra Frontend

1. Mở ứng dụng Angular
2. Load dữ liệu Excel
3. Click nút "Xuất Excel"
4. Chọn mapping các cột
5. Kiểm tra file Excel được download có chart không

## Troubleshooting

### Vấn đề: Backend API không khả dụng

**Giải pháp:**
- Kiểm tra backend server có đang chạy không
- Kiểm tra API URL trong `environment.ts` có đúng không
- Kiểm tra CORS configuration trên backend

### Vấn đề: Chart vẫn bị mất

**Giải pháp:**
- Đảm bảo backend sử dụng thư viện hỗ trợ chart tốt (Apache POI, EPPlus, openpyxl)
- Kiểm tra template file `thongke_template.xlsx` có chart không
- Xem hướng dẫn trong `BACKEND_EXCEL_CHART_GUIDE.md`

### Vấn đề: CORS Error

**Giải pháp:**
- Cấu hình CORS trên backend để cho phép origin của frontend
- Xem hướng dẫn trong `BACKEND_FIX_CORS_GUIDE.md`

### Vấn đề: Authentication Error

**Giải pháp:**
- Đảm bảo user đã đăng nhập
- Kiểm tra token trong localStorage
- Kiểm tra backend có yêu cầu authentication không

## Code Location

- **Component:** `src/app/components/excel-reader/excel-reader.component.ts`
- **Method:** `performExport()`
- **API Endpoint:** `${environment.apiUrl}/ExcelExport/export-excel-with-chart`

## Lưu ý

1. **Template File:** Backend cần có file `thongke_template.xlsx` trong thư mục `assets/`
2. **Chart Configuration:** Chart trong template nên được cấu hình với vùng dữ liệu động (ví dụ: `B4:C1000`)
3. **Data Format:** Đảm bảo dữ liệu gửi lên backend đúng format như mô tả trong request body
4. **Error Handling:** Frontend có cơ chế xử lý lỗi và fallback

## Xem thêm

- `BACKEND_EXCEL_CHART_GUIDE.md` - Hướng dẫn chi tiết cho backend
- `BACKEND_EXCEL_CHART_QUICK_START.md` - Quick start guide cho backend

