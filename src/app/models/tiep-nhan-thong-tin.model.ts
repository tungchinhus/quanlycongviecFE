export interface TiepNhanThongTin {
  id?: number;
  soTNTT: string;
  dienAp: string;
  soLuong: number;
  tieuChuan?: string | null;
  phuKienKemTheo?: string | null;
  khachHang: string;
  ngayNhan: string; // ISO date
  ngayGiao?: string | null;
  ngayLuu?: string | null;
  nguoiThucHien?: string | null;
  ngayHoanThanh?: string | null;
  ghiChu?: string | null;
}
