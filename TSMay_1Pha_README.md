# Hướng Dẫn SQL Script cho Bảng TSMay 1 Pha

## Tổng Quan

Script SQL này cung cấp các bảng và stored procedures để lưu trữ và quản lý dữ liệu máy biến áp 1 pha và 3 pha.

## Cấu Trúc

### 1. Bảng Chính: TSMay
- **Mục đích**: Bảng chung lưu trữ cả dữ liệu 1 pha và 3 pha
- **Cột mới**: `Phase` (NCHAR(1)) - '1' cho 1 pha, '3' cho 3 pha
- **Constraint**: Chỉ cho phép giá trị '1' hoặc '3'

### 2. Bảng Riêng (Tùy chọn)
- **TSMay1Pha**: Bảng riêng cho dữ liệu 1 pha (nếu muốn tách biệt hoàn toàn)
- **TSMay3Pha**: Bảng riêng cho dữ liệu 3 pha (nếu muốn tách biệt hoàn toàn)

### 3. Views
- **VW_TSMay1Pha**: View lọc dữ liệu 1 pha từ bảng TSMay
- **VW_TSMay3Pha**: View lọc dữ liệu 3 pha từ bảng TSMay

### 4. Stored Procedures
- **SP_InsertTSMay1Pha**: Insert một bản ghi 1 pha
- **SP_BulkInsertTSMay1Pha**: Bulk insert nhiều bản ghi 1 pha

## Cách Sử Dụng

### Bước 1: Chạy Script SQL
```sql
-- Mở file TSMay_1Pha_SQL_Script.sql trong SQL Server Management Studio
-- Hoặc chạy từ command line:
sqlcmd -S server_name -d database_name -i TSMay_1Pha_SQL_Script.sql
```

### Bước 2: Kiểm Tra Kết Quả
```sql
-- Kiểm tra cột Phase đã được thêm chưa
SELECT TOP 10 * FROM [dbo].[TSMay];

-- Kiểm tra số lượng dữ liệu theo Phase
SELECT Phase, COUNT(*) AS SoLuong 
FROM [dbo].[TSMay] 
GROUP BY Phase;
```

### Bước 3: Sử Dụng Views
```sql
-- Lấy tất cả dữ liệu 1 pha
SELECT * FROM [dbo].[VW_TSMay1Pha];

-- Lấy tất cả dữ liệu 3 pha
SELECT * FROM [dbo].[VW_TSMay3Pha];
```

### Bước 4: Sử Dụng Stored Procedures
```sql
-- Insert một bản ghi 1 pha
EXEC [dbo].[SP_InsertTSMay1Pha]
    @CongSuat = 37.5,
    @SoMay = 'T00034421',
    @SBB = '2520694',
    @LSX = '50000026',
    @TChuanLSX = 'DLVN-62',
    @TBKT = '24216T',
    @Po = '91',
    @Io = '1.04',
    @UdmLV = '0.23';
```

## Cập Nhật Backend API

Sau khi chạy script SQL, cần cập nhật Backend API:

### 1. Cập Nhật Map Function
```javascript
function mapToDbFormat(data) {
  return {
    CongSuat: data.congSuat !== undefined && data.congSuat !== null ? parseInt(data.congSuat) : null,
    SoMay: data.soMay || null,
    SBB: data.sbb || null,
    LSX: data.lsx || null,
    TChuanLSX: data.tChuanLSX || null,
    TBKT: data.tbkt || null,
    Po: data.po || null,
    Io: data.io || null,
    Pk75H1: data.pk75H1 || null,
    Pk75H2: data.pk75H2 || null,
    Uk75H1: data.uk75H1 || null,
    Uk75H2: data.uk75H2 || null,
    UdmHVH1: data.udmHVH1 || null,
    UdmHVH2: data.udmHVH2 || null,
    UdmLV: data.udmLV || null,
    Phase: data.phase || null  // Thêm dòng này
  };
}
```

### 2. Cập Nhật INSERT Statement
```javascript
const result = await request.query(`
  INSERT INTO TSMay (
    CongSuat, SoMay, SBB, LSX, TChuanLSX, TBKT, Po, Io,
    Pk75H1, Pk75H2, Uk75H1, Uk75H2, UdmHVH1, UdmHVH2, UdmLV, Phase
  )
  OUTPUT INSERTED.*
  VALUES (
    @CongSuat, @SoMay, @SBB, @LSX, @TChuanLSX, @TBKT, @Po, @Io,
    @Pk75H1, @Pk75H2, @Uk75H1, @Uk75H2, @UdmHVH1, @UdmHVH2, @UdmLV, @Phase
  )
`);
```

### 3. Thêm Input Parameter
```javascript
request.input('Phase', sql.NChar(1), dbData.Phase);
```

## Queries Hữu Ích

### Lọc dữ liệu theo Phase
```sql
-- Chỉ lấy dữ liệu 1 pha
SELECT * FROM TSMay WHERE Phase = '1';

-- Chỉ lấy dữ liệu 3 pha
SELECT * FROM TSMay WHERE Phase = '3';

-- Lấy dữ liệu chưa có Phase (dữ liệu cũ)
SELECT * FROM TSMay WHERE Phase IS NULL;
```

### Thống kê
```sql
-- Đếm số lượng theo Phase
SELECT 
    CASE 
        WHEN Phase = '1' THEN '1 Pha'
        WHEN Phase = '3' THEN '3 Pha'
        ELSE 'Chưa xác định'
    END AS LoaiPha,
    COUNT(*) AS SoLuong
FROM TSMay
GROUP BY Phase;
```

### Tìm kiếm theo Phase và SoMay
```sql
SELECT * FROM TSMay 
WHERE Phase = '1' 
  AND SoMay LIKE '%T00034%';
```

## Lưu Ý

1. **Dữ liệu cũ**: Script sẽ tự động set `Phase = '3'` cho các bản ghi cũ chưa có Phase
2. **Index**: Đã tạo index trên cột `Phase` để tối ưu truy vấn
3. **Constraint**: Cột `Phase` chỉ chấp nhận giá trị '1' hoặc '3'
4. **Views**: Có thể sử dụng Views để lọc dữ liệu thay vì query trực tiếp

## Rollback (Nếu cần)

Nếu muốn xóa cột Phase:
```sql
-- Xóa constraint trước
ALTER TABLE [dbo].[TSMay] DROP CONSTRAINT CK_TSMay_Phase;

-- Xóa index
DROP INDEX IX_TSMay_Phase ON [dbo].[TSMay];

-- Xóa cột
ALTER TABLE [dbo].[TSMay] DROP COLUMN Phase;
```

## Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Quyền truy cập database
2. Version SQL Server (cần SQL Server 2016+ cho JSON functions)
3. Logs trong SQL Server Management Studio

