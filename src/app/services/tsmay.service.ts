import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TSMay, CreateTSMayRequest, BulkCreateTSMayRequest, BulkCreateTSMayResponse } from '../models/tsmay.model';
import { environment } from '../../environments/environment';

export interface TSMaySearchResponse {
  data: TSMay[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class TSMayService {
  private apiUrl = `${environment.apiUrl}/tsmay`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy tất cả các bản ghi TSMay
   */
  getAll(): Observable<TSMay[]> {
    return this.http.get<TSMay[]>(this.apiUrl);
  }

  /**
   * Lấy một bản ghi TSMay theo ID
   */
  getById(id: number): Observable<TSMay> {
    return this.http.get<TSMay>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tạo một bản ghi TSMay mới
   */
  create(data: CreateTSMayRequest): Observable<TSMay> {
    return this.http.post<TSMay>(this.apiUrl, data);
  }

  /**
   * Tạo nhiều bản ghi TSMay cùng lúc (bulk insert)
   */
  bulkCreate(data: BulkCreateTSMayRequest): Observable<BulkCreateTSMayResponse> {
    return this.http.post<BulkCreateTSMayResponse>(`${this.apiUrl}/bulk`, data);
  }

  /**
   * Cập nhật một bản ghi TSMay
   */
  update(id: number, data: Partial<CreateTSMayRequest>): Observable<TSMay> {
    return this.http.put<TSMay>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Xóa một bản ghi TSMay
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tìm kiếm TSMay theo các tiêu chí
   */
  search(criteria: {
    soMay?: string;
    sbb?: string;
    lsx?: string;
    congSuat?: number;
    phase?: string;
  }): Observable<TSMay[]> {
    const params = new URLSearchParams();
    if (criteria.soMay) params.append('soMay', criteria.soMay);
    if (criteria.sbb) params.append('sbb', criteria.sbb);
    if (criteria.lsx) params.append('lsx', criteria.lsx);
    if (criteria.congSuat) params.append('congSuat', criteria.congSuat.toString());
    if (criteria.phase) params.append('phase', criteria.phase);
    
    const queryString = params.toString();
    return this.http.get<TSMay[]>(`${this.apiUrl}/search${queryString ? '?' + queryString : ''}`);
  }

  /**
   * Tìm kiếm TSMay với pagination và search text
   * Backend có thể trả về:
   * - TSMaySearchResponse { data, total, page, pageSize } nếu hỗ trợ pagination
   * - TSMay[] nếu chưa hỗ trợ pagination (fallback)
   */
  searchWithPagination(params: {
    search?: string;
    phase?: string;
    page?: number;
    pageSize?: number;
  }): Observable<TSMaySearchResponse | TSMay[]> {
    let httpParams = new HttpParams();
    
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.phase) {
      httpParams = httpParams.set('phase', params.phase);
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize !== undefined) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    
    return this.http.get<TSMaySearchResponse | TSMay[]>(`${this.apiUrl}/search`, { params: httpParams });
  }
}

