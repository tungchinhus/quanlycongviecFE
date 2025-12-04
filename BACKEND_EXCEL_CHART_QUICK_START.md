# Quick Start: Backend Excel Chart Export

## Tóm tắt

Frontend gửi dữ liệu thống kê lên backend, backend xử lý file Excel template (giữ lại chart) và trả về file Excel đã có dữ liệu mới.

## Cấu trúc Request/Response

### Request (POST /api/export-excel-with-chart)

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

**Lưu ý:** `chartConfig` là optional. Nếu không có hoặc `showChart: false`, backend sẽ không tạo/update chart.

### Response

- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="Thong_ke_so_sanh_thong_so_YYYY-MM-DD_HH-mm-ss.xlsx"`
- **Body:** File Excel binary data

## Các bước xử lý trong Backend

1. **Load template Excel** từ `assets/thongke_template.xlsx`
2. **Clear dữ liệu cũ** từ dòng 4 trở đi (chỉ clear giá trị, giữ nguyên style và chart)
3. **Ghi dữ liệu mới** vào các cells từ dòng 4
4. **Merge cells** cho cột "Công suất" theo nhóm (nếu cần)
5. **Xử lý Chart Config** (nếu có):
   - Kiểm tra `chartConfig.showChart === true`
   - Map `xAxisColumn` và `yAxisColumn` sang vị trí cột trong Excel
   - Tạo/update chart với data range động
6. **Save và trả về** file Excel

## Format dữ liệu

- **Cột A (1):** Công suất (text hoặc số)
- **Cột B (2):** TBKT (text)
- **Cột C (3):** Số mẫu (số)
- **Cột D-G (4-7):** Pk H1 (max, TB, min, δ) - số
- **Cột H-K (8-11):** Pk H2 (max, TB, min, δ) - số
- **Cột L-O (12-15):** Uk H1 (max, TB, min, δ) - số
- **Cột P-S (16-19):** Uk H2 (max, TB, min, δ) - số

## Thư viện khuyến nghị

- **Java:** Apache POI ⭐⭐⭐⭐⭐
- **.NET/C#:** EPPlus ⭐⭐⭐⭐⭐
- **Python:** openpyxl ⭐⭐⭐⭐
- **Node.js:** ExcelJS ⭐⭐ (hạn chế, có thể vẫn mất chart)

## Xem chi tiết

- **`BACKEND_EXCEL_CHART_GUIDE.md`** - Code mẫu chi tiết cho từng ngôn ngữ
- **`BACKEND_EXCEL_CHART_DYNAMIC_COLUMNS.md`** - Hướng dẫn xử lý chart động theo lựa chọn cột data (QUAN TRỌNG)

