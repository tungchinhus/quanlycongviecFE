import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MaySuaChua } from '../models/may-sua-chua.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MaySuaChuaService {
  private apiUrl = `${environment.apiUrl}/MaySuaChua`;

  constructor(private http: HttpClient) {}

  /** Lấy danh sách theo năm (2023, 2024, 2025, 2026) */
  getAll(nam: number, search?: string): Observable<MaySuaChua[]> {
    let params: { [key: string]: string } = { nam: String(nam) };
    if (search?.trim()) {
      params['search'] = search.trim();
    }
    return this.http.get<MaySuaChua[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<MaySuaChua> {
    return this.http.get<MaySuaChua>(`${this.apiUrl}/${id}`);
  }

  create(data: MaySuaChua): Observable<MaySuaChua> {
    return this.http.post<MaySuaChua>(this.apiUrl, data);
  }

  update(id: number, data: MaySuaChua): Observable<MaySuaChua> {
    return this.http.put<MaySuaChua>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
