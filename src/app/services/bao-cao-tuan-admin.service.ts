import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { BaoCaoTuanAdminListItem, BaoCaoTuanMonthlyMatrix } from '../models/bao-cao-tuan.model';

@Injectable({ providedIn: 'root' })
export class BaoCaoTuanAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/BaoCaoTuanAdmin`;

  getForMonth(year: number, month: number): Observable<BaoCaoTuanAdminListItem[]> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get<BaoCaoTuanAdminListItem[]>(`${this.base}/for-month`, { params });
  }

  getMatrixForMonth(year: number, month: number): Observable<BaoCaoTuanMonthlyMatrix> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get<BaoCaoTuanMonthlyMatrix>(`${this.base}/matrix-for-month`, { params });
  }

  /** Xuất một file Excel: dòng chi tiết các báo cáo có ngày cập nhật trong tuần lịch hiện tại (VN). */
  exportWeeklyExcelCurrentWeek(): Observable<Blob> {
    return this.http.get(`${this.base}/export-weekly-excel-current-week`, { responseType: 'blob' });
  }

  exportMonthlyWorkbook(year: number, month: number): Observable<Blob> {
    const params = new HttpParams().set('year', String(year)).set('month', String(month));
    return this.http.get(`${this.base}/export-monthly-workbook`, { params, responseType: 'blob' });
  }
}
