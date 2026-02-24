import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HoSoThau } from '../models/ho-so-thau.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HoSoThauService {
  private apiUrl = `${environment.apiUrl}/HoSoThau`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<HoSoThau[]> {
    return this.http.get<HoSoThau[]>(this.apiUrl);
  }

  getById(id: number): Observable<HoSoThau> {
    return this.http.get<HoSoThau>(`${this.apiUrl}/${id}`);
  }

  create(data: HoSoThau): Observable<HoSoThau> {
    return this.http.post<HoSoThau>(this.apiUrl, data);
  }

  update(id: number, data: HoSoThau): Observable<HoSoThau> {
    return this.http.put<HoSoThau>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
