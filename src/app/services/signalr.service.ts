import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: HubConnection;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private authService: AuthService) {}

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      return;
    }

    const user = this.authService.user();
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
      console.warn('Cannot start SignalR: User not authenticated');
      return;
    }

    const hubUrl = `${environment.apiUrl.replace('/api', '')}/notificationHub`;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          // Return Bearer token from localStorage (remove "Bearer " prefix if present)
          if (!token) return '';
          return token.startsWith('Bearer ') ? token.substring(7) : token;
        }
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
          return null; // Stop reconnecting
        }
      })
      .build();

    // Handle connection events
    this.hubConnection.onclose((error) => {
      console.log('SignalR connection closed', error);
      this.reconnectAttempts = 0;
    });

    this.hubConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      this.reconnectAttempts++;
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId);
      this.reconnectAttempts = 0;
    });

    try {
      await this.hubConnection.start();
      console.log('SignalR connection started');
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
    }
  }

  stopConnection(): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      return this.hubConnection.stop();
    }
    return Promise.resolve();
  }

  onNotificationReceived(callback: (notification: any) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('NewNotification', callback);
    }
  }

  onNotificationRemoved(callback: (data: any) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('NotificationRemoved', callback);
    }
  }

  onUnreadCountChanged(callback: () => void): void {
    if (this.hubConnection) {
      this.hubConnection.on('UnreadCountChanged', callback);
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }
}

