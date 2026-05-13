import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { BaoCaoTuanDetail, BaoCaoTuanListItem, BaoCaoTuanSavePayload } from '../models/bao-cao-tuan.model';

@Injectable({ providedIn: 'root' })
export class BaoCaoTuanService {
  private readonly base = `${environment.apiUrl}/BaoCaoTuan`;

  constructor(private readonly http: HttpClient) {}

  getMy(params?: { tuNgay?: string; denNgay?: string }): Observable<BaoCaoTuanListItem[]> {
    let httpParams = new HttpParams();
    const tu = params?.tuNgay?.trim();
    const den = params?.denNgay?.trim();
    if (tu) httpParams = httpParams.set('tuNgay', tu);
    if (den) httpParams = httpParams.set('denNgay', den);
    return this.http.get<BaoCaoTuanListItem[]>(`${this.base}/my`, { params: httpParams });
  }

  getMyById(id: number): Observable<BaoCaoTuanDetail> {
    return this.http.get<BaoCaoTuanDetail>(`${this.base}/my/${id}`);
  }

  create(payload: BaoCaoTuanSavePayload): Observable<BaoCaoTuanDetail> {
    return this.http.post<BaoCaoTuanDetail>(this.base, payload);
  }

  update(id: number, payload: BaoCaoTuanSavePayload): Observable<BaoCaoTuanDetail> {
    return this.http.put<BaoCaoTuanDetail>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
