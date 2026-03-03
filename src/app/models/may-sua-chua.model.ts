export interface MaySuaChua {
  id?: number;
  /** Năm (2023, 2024, 2025, 2026) */
  nam: number;
  /** Số TNTT/DV/ĐH-P.KD (VD: 08/2026-DV) */
  soTNTT_DV_DH_PKD?: string | null;
  /** Thông tin khách hàng */
  thongTinKhachHang?: string | null;
  /** S (kVA) */
  skVA?: string | null;
  /** Điện áp */
  dienAp?: string | null;
  /** Ngày nhận (ISO date) */
  ngayNhan?: string | null;
  /** Người thực hiện */
  nguoiThucHien?: string | null;
  /** Số máy */
  soMay?: string | null;
  /** Số TBKT sửa */
  soTBKTSua?: string | null;
  /** Giao P.KD */
  giaoPKD?: string | null;
  /** Ghi chú */
  ghiChu?: string | null;
}
