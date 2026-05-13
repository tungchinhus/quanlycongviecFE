import type { BaoCaoTuanRow } from '../models/bao-cao-tuan.model';
import raw from './weekly-report-default-rows.json';

/** Khung dòng theo mẫu Excel (Báo cáo tuần năm 2026), nội dung ô trống. */
export function getDefaultWeeklyReportRows(): BaoCaoTuanRow[] {
  return JSON.parse(JSON.stringify(raw)) as BaoCaoTuanRow[];
}
