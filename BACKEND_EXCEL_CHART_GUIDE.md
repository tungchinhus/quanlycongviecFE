# Hướng dẫn tạo Backend Endpoint xử lý Excel với Chart

## Tổng quan

Hướng dẫn này mô tả cách tạo backend endpoint để xử lý file Excel template có sẵn chart, chỉ clear data và fill lại data mới mà không làm mất chart.

## Vấn đề

Các thư viện JavaScript xử lý Excel (ExcelJS, xlsx-js-style) không hỗ trợ đầy đủ việc đọc/ghi chart. Khi load và save file Excel, chart sẽ bị mất.

## Giải pháp

Sử dụng backend với thư viện hỗ trợ chart tốt hơn để xử lý file Excel.

---

## 1. Node.js/Express với ExcelJS + Chart Plugin

### Cài đặt

```bash
npm install exceljs
npm install express
npm install multer
```

### Code mẫu

```javascript
const express = require('express');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Endpoint để xử lý Excel với chart
router.post('/export-excel-with-chart', async (req, res) => {
  try {
    const { statisticsData } = req.body; // Dữ liệu thống kê từ frontend
    
    // Đường dẫn đến template
    const templatePath = path.join(__dirname, '../assets/thongke_template.xlsx');
    
    // Load template
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    // Lấy worksheet "Thống kê"
    const worksheet = workbook.getWorksheet('Thống kê');
    if (!worksheet) {
      return res.status(400).json({ error: 'Không tìm thấy worksheet "Thống kê"' });
    }
    
    // Clear dữ liệu cũ từ dòng 4 trở đi
    const dataStartRow = 4;
    const lastRow = worksheet.lastRow;
    
    if (lastRow && lastRow.number >= dataStartRow) {
      // Clear giá trị các cells từ dòng 4 đến dòng cuối
      for (let rowNum = dataStartRow; rowNum <= lastRow.number; rowNum++) {
        const row = worksheet.getRow(rowNum);
        for (let colNum = 1; colNum <= 19; colNum++) {
          const cell = row.getCell(colNum);
          cell.value = null;
        }
      }
    }
    
    // Ghi dữ liệu mới
    statisticsData.forEach((stats, index) => {
      const row = worksheet.getRow(dataStartRow + index);
      
      const formatNumber = (val) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') {
          const rounded = Math.round(val * 100) / 100;
          return rounded % 1 === 0 ? Math.round(rounded) : rounded;
        }
        const num = Number(val);
        return isNaN(num) ? null : num;
      };
      
      // Ghi dữ liệu vào các cột
      row.getCell(1).value = stats.congSuat || ''; // Công suất
      row.getCell(2).value = String(stats.tbkt || ''); // TBKT
      row.getCell(3).value = formatNumber(stats.soMau) ?? 0; // Số mẫu
      
      // Pk H1
      row.getCell(4).value = formatNumber(stats.pkH1Max);
      row.getCell(5).value = formatNumber(stats.pkH1TB);
      row.getCell(6).value = formatNumber(stats.pkH1Min);
      row.getCell(7).value = formatNumber(stats.pkH1Delta);
      
      // Pk H2
      row.getCell(8).value = formatNumber(stats.pkH2Max);
      row.getCell(9).value = formatNumber(stats.pkH2TB);
      row.getCell(10).value = formatNumber(stats.pkH2Min);
      row.getCell(11).value = formatNumber(stats.pkH2Delta);
      
      // Uk H1
      row.getCell(12).value = formatNumber(stats.ukH1Max);
      row.getCell(13).value = formatNumber(stats.ukH1TB);
      row.getCell(14).value = formatNumber(stats.ukH1Min);
      row.getCell(15).value = formatNumber(stats.ukH1Delta);
      
      // Uk H2
      row.getCell(16).value = formatNumber(stats.ukH2Max);
      row.getCell(17).value = formatNumber(stats.ukH2TB);
      row.getCell(18).value = formatNumber(stats.ukH2Min);
      row.getCell(19).value = formatNumber(stats.ukH2Delta);
    });
    
    // Merge cells cho Công suất theo nhóm (nếu cần)
    // ... logic merge cells ...
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Set headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `Thong_ke_so_sanh_thong_so_${timestamp}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ error: 'Lỗi khi xuất file Excel', details: error.message });
  }
});

module.exports = router;
```

**Lưu ý:** ExcelJS vẫn có thể không giữ lại chart. Nếu vẫn bị mất chart, hãy thử các giải pháp dưới đây.

---

## 2. Python/Flask với openpyxl (Khuyến nghị)

### Cài đặt

```bash
pip install openpyxl flask flask-cors
```

### Code mẫu

```python
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
import io
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/api/export-excel-with-chart', methods=['POST'])
def export_excel_with_chart():
    try:
        data = request.json
        statistics_data = data.get('statisticsData', [])
        
        # Đường dẫn đến template
        template_path = 'assets/thongke_template.xlsx'
        
        # Load template (openpyxl giữ lại chart tốt hơn)
        workbook = load_workbook(template_path)
        worksheet = workbook['Thống kê']
        
        # Clear dữ liệu cũ từ dòng 4 trở đi
        data_start_row = 4
        max_row = worksheet.max_row
        
        if max_row >= data_start_row:
            for row_num in range(data_start_row, max_row + 1):
                for col_num in range(1, 20):  # Cột A đến S (1-19)
                    cell = worksheet.cell(row=row_num, column=col_num)
                    cell.value = None
        
        # Ghi dữ liệu mới
        def format_number(val):
            if val is None or val == '':
                return None
            if isinstance(val, (int, float)):
                rounded = round(val * 100) / 100
                return int(rounded) if rounded % 1 == 0 else rounded
            try:
                num = float(val)
                return None if num != num else num  # Check NaN
            except:
                return None
        
        for index, stats in enumerate(statistics_data):
            row_num = data_start_row + index
            
            # Ghi dữ liệu vào các cột
            worksheet.cell(row=row_num, column=1).value = stats.get('congSuat', '')
            worksheet.cell(row=row_num, column=2).value = str(stats.get('tbkt', ''))
            worksheet.cell(row=row_num, column=3).value = format_number(stats.get('soMau')) or 0
            
            # Pk H1
            worksheet.cell(row=row_num, column=4).value = format_number(stats.get('pkH1Max'))
            worksheet.cell(row=row_num, column=5).value = format_number(stats.get('pkH1TB'))
            worksheet.cell(row=row_num, column=6).value = format_number(stats.get('pkH1Min'))
            worksheet.cell(row=row_num, column=7).value = format_number(stats.get('pkH1Delta'))
            
            # Pk H2
            worksheet.cell(row=row_num, column=8).value = format_number(stats.get('pkH2Max'))
            worksheet.cell(row=row_num, column=9).value = format_number(stats.get('pkH2TB'))
            worksheet.cell(row=row_num, column=10).value = format_number(stats.get('pkH2Min'))
            worksheet.cell(row=row_num, column=11).value = format_number(stats.get('pkH2Delta'))
            
            # Uk H1
            worksheet.cell(row=row_num, column=12).value = format_number(stats.get('ukH1Max'))
            worksheet.cell(row=row_num, column=13).value = format_number(stats.get('ukH1TB'))
            worksheet.cell(row=row_num, column=14).value = format_number(stats.get('ukH1Min'))
            worksheet.cell(row=row_num, column=15).value = format_number(stats.get('ukH1Delta'))
            
            # Uk H2
            worksheet.cell(row=row_num, column=16).value = format_number(stats.get('ukH2Max'))
            worksheet.cell(row=row_num, column=17).value = format_number(stats.get('ukH2TB'))
            worksheet.cell(row=row_num, column=18).value = format_number(stats.get('ukH2Min'))
            worksheet.cell(row=row_num, column=19).value = format_number(stats.get('ukH2Delta'))
        
        # Merge cells cho Công suất theo nhóm (nếu cần)
        # ... logic merge cells ...
        
        # Save vào buffer
        output = io.BytesIO()
        workbook.save(output)
        output.seek(0)
        
        # Tạo tên file
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        filename = f'Thong_ke_so_sanh_thong_so_{timestamp}.xlsx'
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f'Error exporting Excel: {e}')
        return jsonify({'error': 'Lỗi khi xuất file Excel', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3001)
```

**Lưu ý:** `openpyxl` hỗ trợ chart tốt hơn ExcelJS, nhưng vẫn có thể có một số hạn chế.

---

## 3. Java/Spring Boot với Apache POI (Khuyến nghị nhất)

### Dependencies (pom.xml)

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.apache.poi</groupId>
        <artifactId>poi-ooxml</artifactId>
        <version>5.2.3</version>
    </dependency>
</dependencies>
```

### Code mẫu

```java
package com.example.controller;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ExcelExportController {

    @PostMapping("/export-excel-with-chart")
    public ResponseEntity<byte[]> exportExcelWithChart(@RequestBody Map<String, Object> request) {
        try {
            List<Map<String, Object>> statisticsData = (List<Map<String, Object>>) request.get("statisticsData");
            
            // Load template từ resources
            ClassPathResource resource = new ClassPathResource("assets/thongke_template.xlsx");
            InputStream templateStream = resource.getInputStream();
            
            // Apache POI giữ lại chart tốt nhất
            Workbook workbook = new XSSFWorkbook(templateStream);
            Sheet sheet = workbook.getSheet("Thống kê");
            
            if (sheet == null) {
                sheet = workbook.getSheetAt(0);
            }
            
            int dataStartRow = 3; // 0-based index, row 4 = index 3
            int lastRowNum = sheet.getLastRowNum();
            
            // Clear dữ liệu cũ từ dòng 4 trở đi
            if (lastRowNum >= dataStartRow) {
                for (int rowNum = dataStartRow; rowNum <= lastRowNum; rowNum++) {
                    Row row = sheet.getRow(rowNum);
                    if (row != null) {
                        for (int colNum = 0; colNum < 19; colNum++) {
                            Cell cell = row.getCell(colNum);
                            if (cell != null) {
                                cell.setCellValue((String) null);
                            }
                        }
                    }
                }
            }
            
            // Ghi dữ liệu mới
            for (int index = 0; index < statisticsData.size(); index++) {
                Map<String, Object> stats = statisticsData.get(index);
                Row row = sheet.getRow(dataStartRow + index);
                if (row == null) {
                    row = sheet.createRow(dataStartRow + index);
                }
                
                // Helper function để format number
                // ... (tương tự như các ngôn ngữ khác)
                
                // Ghi dữ liệu
                setCellValue(row, 0, stats.get("congSuat"));
                setCellValue(row, 1, stats.get("tbkt"));
                setCellNumericValue(row, 2, stats.get("soMau"));
                
                // Pk H1
                setCellNumericValue(row, 3, stats.get("pkH1Max"));
                setCellNumericValue(row, 4, stats.get("pkH1TB"));
                setCellNumericValue(row, 5, stats.get("pkH1Min"));
                setCellNumericValue(row, 6, stats.get("pkH1Delta"));
                
                // Pk H2, Uk H1, Uk H2 tương tự...
            }
            
            // Merge cells cho Công suất (nếu cần)
            // ... logic merge cells ...
            
            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            workbook.close();
            
            // Tạo tên file
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
            String filename = "Thong_ke_so_sanh_thong_so_" + timestamp + ".xlsx";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", filename);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(outputStream.toByteArray());
                    
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    private void setCellValue(Row row, int colIndex, Object value) {
        Cell cell = row.getCell(colIndex);
        if (cell == null) {
            cell = row.createCell(colIndex);
        }
        if (value == null) {
            cell.setBlank();
        } else {
            cell.setCellValue(String.valueOf(value));
        }
    }
    
    private void setCellNumericValue(Row row, int colIndex, Object value) {
        Cell cell = row.getCell(colIndex);
        if (cell == null) {
            cell = row.createCell(colIndex, CellType.NUMERIC);
        }
        if (value == null) {
            cell.setBlank();
        } else {
            double numValue = value instanceof Number ? 
                ((Number) value).doubleValue() : 
                Double.parseDouble(String.valueOf(value));
            cell.setCellValue(numValue);
        }
    }
}
```

**Lưu ý:** Apache POI là thư viện Java mạnh nhất để xử lý Excel với chart, được khuyến nghị sử dụng.

---

## 4. .NET/C# với EPPlus (Khuyến nghị)

### Package

```bash
Install-Package EPPlus
```

### Code mẫu

```csharp
using OfficeOpenXml;
using System.IO;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class ExcelExportController : ControllerBase
{
    [HttpPost("export-excel-with-chart")]
    public IActionResult ExportExcelWithChart([FromBody] ExportRequest request)
    {
        try
        {
            // Đường dẫn đến template
            string templatePath = Path.Combine("assets", "thongke_template.xlsx");
            
            // EPPlus giữ lại chart tốt
            using (var package = new ExcelPackage(new FileInfo(templatePath)))
            {
                var worksheet = package.Workbook.Worksheets["Thống kê"];
                if (worksheet == null)
                {
                    worksheet = package.Workbook.Worksheets[0];
                }
                
                int dataStartRow = 4;
                int lastRow = worksheet.Dimension?.End.Row ?? dataStartRow;
                
                // Clear dữ liệu cũ
                if (lastRow >= dataStartRow)
                {
                    worksheet.Cells[dataStartRow, 1, lastRow, 19].Clear();
                }
                
                // Ghi dữ liệu mới
                for (int index = 0; index < request.StatisticsData.Count; index++)
                {
                    var stats = request.StatisticsData[index];
                    int rowNum = dataStartRow + index;
                    
                    worksheet.Cells[rowNum, 1].Value = stats.CongSuat ?? "";
                    worksheet.Cells[rowNum, 2].Value = stats.Tbkt ?? "";
                    worksheet.Cells[rowNum, 3].Value = stats.SoMau ?? 0;
                    
                    // Pk H1, Pk H2, Uk H1, Uk H2...
                }
                
                // Generate file
                var stream = new MemoryStream();
                package.SaveAs(stream);
                stream.Position = 0;
                
                string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
                string filename = $"Thong_ke_so_sanh_thong_so_{timestamp}.xlsx";
                
                return File(stream, 
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                    filename);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Lỗi khi xuất file Excel", details = ex.Message });
        }
    }
}
```

---

## 5. Cập nhật Frontend để gọi Backend API

### Code mẫu trong Angular

```typescript
// Trong excel-reader.component.ts

private async performExport(data: ExcelData[], mapping: ExportColumnMapping) {
  try {
    // ... tính toán statisticsRows như cũ ...
    
    // Gọi backend API
    const response = await fetch('http://your-backend-url/api/export-excel-with-chart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statisticsData: statisticsRows
      })
    });
    
    if (!response.ok) {
      throw new Error('Lỗi khi gọi backend API');
    }
    
    // Nhận file từ backend
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Lấy tên file từ header
    const contentDisposition = response.headers.get('Content-Disposition');
    const fileName = contentDisposition 
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : `Thong_ke_so_sanh_thong_so_${new Date().toISOString()}.xlsx`;
    
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Đã xuất thống kê ra file Excel với chart', 'Đóng', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    this.snackBar.open(`Lỗi khi xuất file: ${error.message}`, 'Đóng', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}
```

---

## So sánh các giải pháp

| Thư viện | Ngôn ngữ | Hỗ trợ Chart | Khuyến nghị |
|----------|----------|-------------|-------------|
| Apache POI | Java | ⭐⭐⭐⭐⭐ | Tốt nhất |
| EPPlus | .NET/C# | ⭐⭐⭐⭐⭐ | Rất tốt |
| openpyxl | Python | ⭐⭐⭐⭐ | Tốt |
| ExcelJS | Node.js | ⭐⭐ | Hạn chế |

---

## Lưu ý quan trọng

1. **Template file:** Đảm bảo file template `thongke_template.xlsx` được đặt đúng vị trí trong backend (thường là trong thư mục `assets` hoặc `resources`).

2. **Chart configuration:** Trong template Excel, cấu hình chart với vùng dữ liệu động (ví dụ: `B4:C1000`) để chart tự động cập nhật khi có dữ liệu mới.

3. **CORS:** Nếu frontend và backend chạy trên các domain khác nhau, cần cấu hình CORS trên backend.

4. **Error handling:** Luôn xử lý lỗi và trả về thông báo rõ ràng cho frontend.

---

## Kết luận

Sử dụng backend với thư viện hỗ trợ chart tốt (Apache POI, EPPlus, hoặc openpyxl) là giải pháp tốt nhất để xử lý file Excel với chart mà không làm mất chart.

