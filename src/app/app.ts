import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SidenavService } from './services/sidenav.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('quanlyfile');
  isAuthenticated = false;
  private destroy$ = new Subject<void>();

  constructor(
    public sidenavService: SidenavService
  ) {}

  ngOnInit(): void {
    // For now, we'll set authenticated to true for demo purposes
    // In a real app, you would check authentication status here
    this.isAuthenticated = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentUserInitials(): string {
    // Mock user data for demo
    return 'TU';
  }

  getCurrentUserName(): string {
    return 'Thibidi User';
  }

  getCurrentUserEmail(): string {
    return 'user@thibidi.com';
  }

  getCurrentUserRole(): string {
    return 'Administrator';
  }

  hasAdminRole(): boolean {
    return true; // Mock admin role for demo
  }

  logout(): void {
    // Mock logout functionality
    this.isAuthenticated = false;
    console.log('User logged out');
  }

  toggleSidenav(): void {
    this.sidenavService.toggle();
  }
}
