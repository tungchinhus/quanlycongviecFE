export interface TiepNhanThongTin {
  id?: number;
  soTNTT: string;
  dienAp: string;
  soLuong: number;
  /** Tháng/Năm (VD: 12/2025, 01/2026) */
  thangNam?: string | null;
  /** Tên nhân viên P. KD */
  tenNVPKD?: string | null;
  /** S (kVA), có thể nhiều giá trị cách nhau dấu phẩy */
  skVA?: string | null;
  tieuChuan?: string | null;
  phuKienKemTheo?: string | null;
  khachHang: string;
  ngayNhan: string; // ISO date
  ngayGiao?: string | null;
  ngayLuu?: string | null;
  nguoiThucHien?: string | null;
  ngayHoanThanh?: string | null;
  ghiChu?: string | null;
  /** Phân loại: Tiếp nhận mới | Xuất Khẩu | DVKH | VPMB | Đơn Hàng */
  phanLoai?: string | null;
}
