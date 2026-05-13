export interface BaoCaoTuanRow {
  stt: number | null;
  danhMuc1: string;
  danhMuc2: string;
  ketQua: string;
  tongSo: string;
  vuongMac: string;
  deXuat: string;
}

export interface BaoCaoTuanListItem {
  id: number;
  tuanBaoCao: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface BaoCaoTuanDetail extends BaoCaoTuanListItem {
  rows: BaoCaoTuanRow[];
}

export interface BaoCaoTuanSavePayload {
  tuanBaoCao: string;
  rows: BaoCaoTuanRow[];
}

/** Danh sách báo cáo tuần (admin/manager) — lọc theo tháng cập nhật. */
export interface BaoCaoTuanAdminListItem {
  id: number;
  userId: number;
  nguoiLap: string;
  tuanBaoCao: string;
  createdAt: string;
  updatedAt: string | null;
  capNhat: string;
}

export interface BaoCaoTuanMonthlyStaffColumn {
  columnIndex: number;
  label: string;
  userId: number | null;
}

export interface BaoCaoTuanMonthlyMatrixRow {
  rowIndex: number;
  stt: string;
  danhMuc1: string;
  danhMuc2: string;
  values: Record<string, number>;
}

export interface BaoCaoTuanMonthlyMatrix {
  staffColumns: BaoCaoTuanMonthlyStaffColumn[];
  rows: BaoCaoTuanMonthlyMatrixRow[];
}
