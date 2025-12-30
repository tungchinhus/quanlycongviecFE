import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy tất cả notifications của user hiện tại
   */
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  /**
   * Lấy số lượng notifications chưa đọc
   */
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`);
  }

  /**
   * Đánh dấu notification là đã đọc
   */
  markAsRead(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/read`, {});
  }

  /**
   * Đánh dấu tất cả notifications là đã đọc
   */
  markAllAsRead(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/mark-all-read`, {});
  }

  /**
   * Đồng bộ notifications cho user hiện tại (tạo notifications cho các work items đã được giao)
   */
  syncMyNotifications(): Observable<{ message: string; created: number; skipped: number }> {
    return this.http.post<{ message: string; created: number; skipped: number }>(`${this.apiUrl}/sync-my-notifications`, {});
  }
}

