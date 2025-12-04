# Hướng dẫn Backend: Xuất Excel với Chart Động theo Lựa chọn Cột Data

## Tổng quan

Frontend hiện tại cho phép người dùng chọn các cột để hiển thị trên trục X và Y của line chart. Backend cần xử lý `chartConfig` từ request để tạo/update chart động dựa trên các cột được chọn.

## Cấu trúc Request mới

### Request Body

```json
{
  "statisticsData": [
    {
      "congSuat": "250",
      "tbkt": "19134A",
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
  ],
  "chartConfig": {
    "showChart": true,
    "xAxisColumn": "tbkt",
    "yAxisColumn": "soMau",
    "xAxisOriginalColumn": "TBKT_LSX",
    "yAxisOriginalColumn": "Po_(W)"
  }
}
```

### Giải thích chartConfig

- **showChart**: `true` nếu người dùng muốn hiển thị chart, `false` hoặc không có nếu không muốn
- **xAxisColumn**: Tên cột trong `statisticsData` dùng cho trục X (ví dụ: "tbkt", "congSuat")
- **yAxisColumn**: Tên cột trong `statisticsData` dùng cho trục Y (ví dụ: "soMau", "pkH1TB", "ukH1Max")
- **xAxisOriginalColumn**: Tên cột gốc từ dữ liệu Excel (để tham khảo)
- **yAxisOriginalColumn**: Tên cột gốc từ dữ liệu Excel (để tham khảo)

## Mapping Cột Statistics Data sang Vị trí Excel

### Bảng Mapping

| Cột Statistics Data | Vị trí Excel | Mô tả |
|---------------------|--------------|-------|
| `congSuat` | Cột A (1) | Công suất |
| `tbkt` | Cột B (2) | TBKT |
| `soMau` | Cột C (3) | Số mẫu |
| `pkH1Max` | Cột D (4) | Pk H1 Max |
| `pkH1TB` | Cột E (5) | Pk H1 TB |
| `pkH1Min` | Cột F (6) | Pk H1 Min |
| `pkH1Delta` | Cột G (7) | Pk H1 δ |
| `pkH2Max` | Cột H (8) | Pk H2 Max |
| `pkH2TB` | Cột I (9) | Pk H2 TB |
| `pkH2Min` | Cột J (10) | Pk H2 Min |
| `pkH2Delta` | Cột K (11) | Pk H2 δ |
| `ukH1Max` | Cột L (12) | Uk H1 Max |
| `ukH1TB` | Cột M (13) | Uk H1 TB |
| `ukH1Min` | Cột N (14) | Uk H1 Min |
| `ukH1Delta` | Cột O (15) | Uk H1 δ |
| `ukH2Max` | Cột P (16) | Uk H2 Max |
| `ukH2TB` | Cột Q (17) | Uk H2 TB |
| `ukH2Min` | Cột R (18) | Uk H2 Min |
| `ukH2Delta` | Cột S (19) | Uk H2 δ |

### Helper Function để Map Cột

```javascript
// JavaScript/Node.js
function getColumnIndex(columnName) {
  const columnMap = {
    'congSuat': 1,  // A
    'tbkt': 2,      // B
    'soMau': 3,     // C
    'pkH1Max': 4,   // D
    'pkH1TB': 5,    // E
    'pkH1Min': 6,   // F
    'pkH1Delta': 7, // G
    'pkH2Max': 8,   // H
    'pkH2TB': 9,    // I
    'pkH2Min': 10,  // J
    'pkH2Delta': 11,// K
    'ukH1Max': 12,  // L
    'ukH1TB': 13,   // M
    'ukH1Min': 14,  // N
    'ukH1Delta': 15,// O
    'ukH2Max': 16,  // P
    'ukH2TB': 17,   // Q
    'ukH2Min': 18,  // R
    'ukH2Delta': 19 // S
  };
  return columnMap[columnName] || null;
}

function getColumnLetter(columnIndex) {
  return String.fromCharCode(64 + columnIndex); // A=65, B=66, ...
}
```

```python
# Python
COLUMN_MAP = {
    'congSuat': 1,   # A
    'tbkt': 2,       # B
    'soMau': 3,      # C
    'pkH1Max': 4,    # D
    'pkH1TB': 5,     # E
    'pkH1Min': 6,    # F
    'pkH1Delta': 7,  # G
    'pkH2Max': 8,    # H
    'pkH2TB': 9,     # I
    'pkH2Min': 10,   # J
    'pkH2Delta': 11, # K
    'ukH1Max': 12,   # L
    'ukH1TB': 13,    # M
    'ukH1Min': 14,   # N
    'ukH1Delta': 15, # O
    'ukH2Max': 16,   # P
    'ukH2TB': 17,    # Q
    'ukH2Min': 18,   # R
    'ukH2Delta': 19  # S
}

def get_column_letter(column_index):
    return chr(64 + column_index)  # A=65, B=66, ...
```

```java
// Java
private static final Map<String, Integer> COLUMN_MAP = new HashMap<>();
static {
    COLUMN_MAP.put("congSuat", 1);   // A
    COLUMN_MAP.put("tbkt", 2);       // B
    COLUMN_MAP.put("soMau", 3);      // C
    COLUMN_MAP.put("pkH1Max", 4);    // D
    COLUMN_MAP.put("pkH1TB", 5);     // E
    COLUMN_MAP.put("pkH1Min", 6);    // F
    COLUMN_MAP.put("pkH1Delta", 7);  // G
    COLUMN_MAP.put("pkH2Max", 8);    // H
    COLUMN_MAP.put("pkH2TB", 9);     // I
    COLUMN_MAP.put("pkH2Min", 10);   // J
    COLUMN_MAP.put("pkH2Delta", 11); // K
    COLUMN_MAP.put("ukH1Max", 12);   // L
    COLUMN_MAP.put("ukH1TB", 13);    // M
    COLUMN_MAP.put("ukH1Min", 14);   // N
    COLUMN_MAP.put("ukH1Delta", 15); // O
    COLUMN_MAP.put("ukH2Max", 16);   // P
    COLUMN_MAP.put("ukH2TB", 17);    // Q
    COLUMN_MAP.put("ukH2Min", 18);   // R
    COLUMN_MAP.put("ukH2Delta", 19); // S
}

private static String getColumnLetter(int columnIndex) {
    return String.valueOf((char) (64 + columnIndex));
}
```

## Các bước xử lý trong Backend

### 1. Load Template và Clear Data

```javascript
// Load template Excel
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(templatePath);

const worksheet = workbook.getWorksheet('Thống kê');
const dataStartRow = 4; // Dòng bắt đầu dữ liệu

// Clear dữ liệu cũ từ dòng 4 trở đi
// ... (giữ nguyên code clear data)
```

### 2. Ghi Dữ liệu Mới

```javascript
// Ghi dữ liệu mới vào Excel
statisticsData.forEach((stats, index) => {
  const rowNum = dataStartRow + index;
  
  worksheet.getCell(rowNum, 1).value = stats.congSuat || '';
  worksheet.getCell(rowNum, 2).value = stats.tbkt || '';
  worksheet.getCell(rowNum, 3).value = stats.soMau || 0;
  // ... ghi các cột khác
});
```

### 3. Xử lý Chart Config (QUAN TRỌNG)

```javascript
// Kiểm tra nếu có chartConfig
if (requestBody.chartConfig && requestBody.chartConfig.showChart) {
  const chartConfig = requestBody.chartConfig;
  const xAxisColumn = chartConfig.xAxisColumn; // ví dụ: "tbkt"
  const yAxisColumn = chartConfig.yAxisColumn; // ví dụ: "soMau"
  
  // Lấy vị trí cột trong Excel
  const xAxisColIndex = getColumnIndex(xAxisColumn); // ví dụ: 2 (cột B)
  const yAxisColIndex = getColumnIndex(yAxisColumn); // ví dụ: 3 (cột C)
  
  // Tính toán vùng dữ liệu cho chart
  const dataStartRow = 4;
  const dataEndRow = dataStartRow + statisticsData.length - 1;
  
  // Tạo range cho X-axis (ví dụ: B4:B17)
  const xAxisRange = `${getColumnLetter(xAxisColIndex)}${dataStartRow}:${getColumnLetter(xAxisColIndex)}${dataEndRow}`;
  
  // Tạo range cho Y-axis (ví dụ: C4:C17)
  const yAxisRange = `${getColumnLetter(yAxisColIndex)}${dataStartRow}:${getColumnLetter(yAxisColIndex)}${dataEndRow}`;
  
  // Update hoặc tạo chart
  updateChart(worksheet, xAxisRange, yAxisRange);
}
```

## Code mẫu chi tiết theo ngôn ngữ

### 1. Python với openpyxl

```python
from openpyxl import load_workbook
from openpyxl.chart import LineChart, Reference

def export_excel_with_dynamic_chart(request_data):
    statistics_data = request_data.get('statisticsData', [])
    chart_config = request_data.get('chartConfig')
    
    # Load template
    workbook = load_workbook('assets/thongke_template.xlsx')
    worksheet = workbook['Thống kê']
    
    # Clear và ghi dữ liệu mới
    data_start_row = 4
    # ... (code clear và ghi data)
    
    # Xử lý chart nếu có
    if chart_config and chart_config.get('showChart'):
        x_axis_col = chart_config.get('xAxisColumn')
        y_axis_col = chart_config.get('yAxisColumn')
        
        # Map cột sang index Excel
        x_col_index = COLUMN_MAP.get(x_axis_col)
        y_col_index = COLUMN_MAP.get(y_axis_col)
        
        if x_col_index and y_col_index:
            data_end_row = data_start_row + len(statistics_data) - 1
            
            # Tạo range cho chart
            x_axis_letter = get_column_letter(x_col_index)
            y_axis_letter = get_column_letter(y_col_index)
            
            x_range = f'{x_axis_letter}{data_start_row}:{x_axis_letter}{data_end_row}'
            y_range = f'{y_axis_letter}{data_start_row}:{y_axis_letter}{data_end_row}'
            
            # Xóa chart cũ nếu có
            # (openpyxl không hỗ trợ update chart trực tiếp, cần xóa và tạo mới)
            if worksheet._charts:
                worksheet._charts.clear()
            
            # Tạo chart mới
            chart = LineChart()
            chart.title = "Biểu đồ thống kê"
            chart.style = 10
            chart.y_axis.title = y_axis_col
            chart.x_axis.title = x_axis_col
            
            # Thêm data
            x_data = Reference(worksheet, min_col=x_col_index, min_row=data_start_row-1, 
                              max_row=data_end_row)
            y_data = Reference(worksheet, min_col=y_col_index, min_row=data_start_row-1, 
                              max_row=data_end_row)
            
            chart.add_data(y_data, titles_from_data=True)
            chart.set_categories(x_data)
            
            # Thêm chart vào worksheet (ví dụ: dòng 20)
            worksheet.add_chart(chart, f"A{data_start_row + len(statistics_data) + 2}")
    
    # Save và trả về
    # ...
```

### 2. Java với Apache POI

```java
@PostMapping("/export-excel-with-chart")
public ResponseEntity<byte[]> exportExcelWithChart(@RequestBody Map<String, Object> request) {
    try {
        List<Map<String, Object>> statisticsData = 
            (List<Map<String, Object>>) request.get("statisticsData");
        Map<String, Object> chartConfig = 
            (Map<String, Object>) request.get("chartConfig");
        
        // Load template
        ClassPathResource resource = new ClassPathResource("assets/thongke_template.xlsx");
        InputStream templateStream = resource.getInputStream();
        Workbook workbook = new XSSFWorkbook(templateStream);
        Sheet sheet = workbook.getSheet("Thống kê");
        
        int dataStartRow = 3; // 0-based, row 4 = index 3
        
        // Clear và ghi dữ liệu mới
        // ... (code clear và ghi data)
        
        // Xử lý chart nếu có
        if (chartConfig != null && Boolean.TRUE.equals(chartConfig.get("showChart"))) {
            String xAxisColumn = (String) chartConfig.get("xAxisColumn");
            String yAxisColumn = (String) chartConfig.get("yAxisColumn");
            
            Integer xColIndex = COLUMN_MAP.get(xAxisColumn);
            Integer yColIndex = COLUMN_MAP.get(yAxisColumn);
            
            if (xColIndex != null && yColIndex != null) {
                int dataEndRow = dataStartRow + statisticsData.size();
                
                // Xóa chart cũ nếu có
                XSSFDrawing drawing = (XSSFDrawing) sheet.createDrawingPatriarch();
                List<XSSFChart> charts = drawing.getCharts();
                for (XSSFChart chart : charts) {
                    // Xóa chart cũ
                }
                
                // Tạo chart mới
                XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 
                    0, dataEndRow + 2, 10, dataEndRow + 15);
                XSSFChart chart = drawing.createChart(anchor);
                
                // Cấu hình chart
                chart.setTitleText("Biểu đồ thống kê");
                
                // Tạo data source
                XDDFDataSource<String> xData = XDDFDataSourcesFactory.fromStringCellRange(
                    sheet, new CellRangeAddress(dataStartRow, dataEndRow - 1, 
                    xColIndex - 1, xColIndex - 1));
                XDDFNumericalDataSource<Double> yData = XDDFDataSourcesFactory.fromNumericCellRange(
                    sheet, new CellRangeAddress(dataStartRow, dataEndRow - 1, 
                    yColIndex - 1, yColIndex - 1));
                
                // Thêm series
                XDDFLineChartData data = (XDDFLineChartData) chart.createData(
                    ChartTypes.LINE, null, null);
                XDDFLineChartData.Series series = (XDDFLineChartData.Series) 
                    data.addSeries(xData, yData);
                series.setTitle(yAxisColumn, null);
                chart.plot(data);
            }
        }
        
        // Save và trả về
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, 
                "attachment; filename=\"Thong_ke_" + 
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss")) + 
                ".xlsx\"")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(outputStream.toByteArray());
            
    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500).build();
    }
}
```

### 3. .NET/C# với EPPlus

```csharp
[HttpPost("export-excel-with-chart")]
public IActionResult ExportExcelWithChart([FromBody] ExportRequest request)
{
    try
    {
        var statisticsData = request.StatisticsData;
        var chartConfig = request.ChartConfig;
        
        // Load template
        string templatePath = Path.Combine("assets", "thongke_template.xlsx");
        using (var package = new ExcelPackage(new FileInfo(templatePath)))
        {
            var worksheet = package.Workbook.Worksheets["Thống kê"];
            if (worksheet == null)
                worksheet = package.Workbook.Worksheets[0];
            
            int dataStartRow = 4;
            
            // Clear và ghi dữ liệu mới
            // ... (code clear và ghi data)
            
            // Xử lý chart nếu có
            if (chartConfig != null && chartConfig.ShowChart)
            {
                var xAxisColumn = chartConfig.XAxisColumn;
                var yAxisColumn = chartConfig.YAxisColumn;
                
                int? xColIndex = GetColumnIndex(xAxisColumn);
                int? yColIndex = GetColumnIndex(yAxisColumn);
                
                if (xColIndex.HasValue && yColIndex.HasValue)
                {
                    int dataEndRow = dataStartRow + statisticsData.Count - 1;
                    
                    // Xóa chart cũ nếu có
                    worksheet.Drawings.Clear();
                    
                    // Tạo chart mới
                    var chart = worksheet.Drawings.AddChart("Chart1", eChartType.Line);
                    chart.Title.Text = "Biểu đồ thống kê";
                    chart.SetPosition(dataEndRow + 2, 0, 0, 0);
                    chart.SetSize(600, 400);
                    
                    // Thêm data
                    var xRange = worksheet.Cells[dataStartRow, xColIndex.Value, 
                        dataEndRow, xColIndex.Value];
                    var yRange = worksheet.Cells[dataStartRow, yColIndex.Value, 
                        dataEndRow, yColIndex.Value];
                    
                    var series = chart.Series.Add(yRange, xRange);
                    series.Header = yAxisColumn;
                }
            }
            
            // Trả về file
            var stream = new MemoryStream();
            package.SaveAs(stream);
            stream.Position = 0;
            
            return File(stream, 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"Thong_ke_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.xlsx");
        }
    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.Message);
    }
}

private int? GetColumnIndex(string columnName)
{
    var columnMap = new Dictionary<string, int>
    {
        {"congSuat", 1}, {"tbkt", 2}, {"soMau", 3},
        {"pkH1Max", 4}, {"pkH1TB", 5}, {"pkH1Min", 6}, {"pkH1Delta", 7},
        {"pkH2Max", 8}, {"pkH2TB", 9}, {"pkH2Min", 10}, {"pkH2Delta", 11},
        {"ukH1Max", 12}, {"ukH1TB", 13}, {"ukH1Min", 14}, {"ukH1Delta", 15},
        {"ukH2Max", 16}, {"ukH2TB", 17}, {"ukH2Min", 18}, {"ukH2Delta", 19}
    };
    
    return columnMap.ContainsKey(columnName) ? columnMap[columnName] : (int?)null;
}
```

## Lưu ý quan trọng

### 1. Xử lý Chart cũ

- **Nếu template đã có chart:** Có thể giữ nguyên và chỉ update data range, hoặc xóa và tạo mới
- **Nếu template chưa có chart:** Tạo chart mới hoàn toàn

### 2. Vị trí Chart

- Chart nên được đặt sau dữ liệu (ví dụ: dòng `dataEndRow + 2`)
- Đảm bảo chart không che khuất dữ liệu

### 3. Format Chart

- **Title:** Có thể dùng tên cột hoặc tên tùy chỉnh
- **Axis Labels:** Sử dụng `xAxisColumn` và `yAxisColumn` để đặt tên trục
- **Style:** Có thể giữ style mặc định hoặc tùy chỉnh

### 4. Error Handling

```javascript
// Kiểm tra chartConfig hợp lệ
if (chartConfig && chartConfig.showChart) {
    if (!chartConfig.xAxisColumn || !chartConfig.yAxisColumn) {
        throw new Error('Chart config thiếu xAxisColumn hoặc yAxisColumn');
    }
    
    const xColIndex = getColumnIndex(chartConfig.xAxisColumn);
    const yColIndex = getColumnIndex(chartConfig.yAxisColumn);
    
    if (!xColIndex || !yColIndex) {
        throw new Error(`Không tìm thấy cột: ${chartConfig.xAxisColumn} hoặc ${chartConfig.yAxisColumn}`);
    }
}
```

## Testing

### Test với curl

```bash
curl -X POST http://localhost:5000/api/ExcelExport/export-excel-with-chart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "statisticsData": [
      {
        "congSuat": "250",
        "tbkt": "19134A",
        "soMau": 78,
        "pkH1Max": 2543,
        "pkH1TB": 2465.38
      }
    ],
    "chartConfig": {
      "showChart": true,
      "xAxisColumn": "tbkt",
      "yAxisColumn": "soMau"
    }
  }' \
  --output test_chart.xlsx
```

## Troubleshooting

### Chart không hiển thị

- Kiểm tra `chartConfig.showChart` có phải `true` không
- Kiểm tra tên cột trong `xAxisColumn` và `yAxisColumn` có đúng không
- Kiểm tra vùng dữ liệu có hợp lệ không (không rỗng, có dữ liệu)

### Chart hiển thị sai dữ liệu

- Kiểm tra mapping cột có đúng không
- Kiểm tra data range có đúng không
- Kiểm tra dữ liệu trong Excel có được ghi đúng không

### Chart bị mất sau khi save

- Đảm bảo sử dụng thư viện hỗ trợ chart tốt (Apache POI, EPPlus, openpyxl)
- Không sử dụng ExcelJS cho chart (hạn chế hỗ trợ)

## Xem thêm

- `BACKEND_EXCEL_CHART_GUIDE.md` - Hướng dẫn chi tiết về Excel chart
- `BACKEND_EXCEL_CHART_QUICK_START.md` - Quick start guide
- `FRONTEND_EXCEL_CHART_INTEGRATION.md` - Hướng dẫn tích hợp frontend

