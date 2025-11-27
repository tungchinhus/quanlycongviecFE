## Hướng dẫn cập nhật backend cho trường TBKT

Frontend đã bổ sung ô nhập `TBKT` và đã map giá trị này vào thuộc tính `tbkt_ID` khi gọi API tạo giao việc (`POST /Assignments`). Để backend nhận và lưu đúng dữ liệu, cần kiểm tra/cập nhật các bước sau:

1. **API DTO/Model**
   - Đảm bảo model/DTO nhận dữ liệu từ request bao gồm thuộc tính `tbkt_ID` (string/null) và `requestDocument`.
   - Ví dụ C#:
     ```csharp
     public class MachineAssignmentDto {
         public string? Tbkt_ID { get; set; }
         public string? RequestDocument { get; set; }
         // ... các trường hiện có
     }
     ```

2. **Controller `POST /Assignments`**
   - Map `dto.Tbkt_ID` vào entity `MachineAssignment.TBKT_ID`.
   - Map `dto.RequestDocument` vào cột thích hợp (nếu đã có) hoặc lưu vào trường mới.
   - Không ép kiểu số; frontend gửi chuỗi dạng `TC: 96/QĐ-HDTV`.

3. **Entity & Migration**
   - Trong entity `MachineAssignment`, chắc chắn đã có property:
     ```csharp
     public string? TBKT_ID { get; set; }
     public string? RequestDocument { get; set; }
     ```
   - Nếu database chưa có cột `RequestDocument`, thêm cột NVARCHAR(255) (hoặc phù hợp) trong bảng `MachineAssignment`.

4. **Seeder/Mapper khác (nếu có)**
   - Cập nhật AutoMapper profile (nếu sử dụng) để map `tbkt_ID`.
   - Điều chỉnh response trả về để bao gồm `tbkt_ID` nhằm hiển thị lại trên frontend.

5. **Kiểm thử**
   - Gửi request mẫu:
     ```json
     {
       "tbkt_ID": "TC: 96/QĐ-HDTV",
       "requestDocument": "ĐĐH-123/2025",
       "machineName": "MBA 3 pha 250kVA",
       "...": "..."
     }
     ```
   - Xác nhận bản ghi mới trong `MachineAssignment` lưu đúng `TBKT_ID` và các trường liên quan.

Sau khi các bước trên hoàn tất, frontend không cần thay đổi thêm để lưu TBKT. Nếu backend sử dụng stored procedure, hãy bổ sung tham số `@TBKT_ID` (nvarchar) và map trước khi insert/update.




