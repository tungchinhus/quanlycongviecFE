export interface HoSoThau {
  id?: number;
  soHST: string;
  donViMoiThau: string;
  soTBMTIB?: string | null;
  ngayNhan: string; // ISO date
  ngayGiaoPhongKD?: string | null;
  ghiChu?: string | null;
}
