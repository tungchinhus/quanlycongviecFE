import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TiepNhanThongTin } from '../models/tiep-nhan-thong-tin.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TiepNhanThongTinService {
  private apiUrl = `${environment.apiUrl}/TiepNhanThongTin`;

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<TiepNhanThongTin[]> {
    const params = search?.trim()
      ? { params: { search: search.trim() } }
      : {};
    return this.http.get<TiepNhanThongTin[]>(this.apiUrl, params);
  }

  getById(id: number): Observable<TiepNhanThongTin> {
    return this.http.get<TiepNhanThongTin>(`${this.apiUrl}/${id}`);
  }

  create(data: TiepNhanThongTin): Observable<TiepNhanThongTin> {
    return this.http.post<TiepNhanThongTin>(this.apiUrl, data);
  }

  update(id: number, data: TiepNhanThongTin): Observable<TiepNhanThongTin> {
    return this.http.put<TiepNhanThongTin>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
