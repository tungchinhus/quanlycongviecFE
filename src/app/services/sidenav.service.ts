import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidenavService {
  private _isOpen = signal(true);
  private _mode = signal<'side' | 'over' | 'push'>('side');
  private _isAutoHide = signal(true);
  private _screenWidth = signal(window.innerWidth);
  private _isCollapsed = signal(false);

  constructor() {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  get isOpen() {
    return this._isOpen.asReadonly();
  }

  get mode() {
    return this._mode.asReadonly();
  }

  get isAutoHide() {
    return this._isAutoHide.asReadonly();
  }

  get screenWidth() {
    return this._screenWidth.asReadonly();
  }

  get isCollapsed() {
    return this._isCollapsed.asReadonly();
  }

  toggle(): void {
    this._isOpen.set(!this._isOpen());
  }

  open(): void {
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
  }

  toggleAutoHide(): void {
    this._isAutoHide.set(!this._isAutoHide());
    this.checkScreenSize();
  }

  toggleCollapse(): void {
    this._isCollapsed.set(!this._isCollapsed());
  }

  collapse(): void {
    this._isCollapsed.set(true);
  }

  expand(): void {
    this._isCollapsed.set(false);
  }

  private checkScreenSize(): void {
    const width = window.innerWidth;
    this._screenWidth.set(width);
    
    if (this._isAutoHide()) {
      if (width < 768) {
        this._mode.set('over');
        this._isOpen.set(false);
      } else {
        this._mode.set('side');
        this._isOpen.set(true);
      }
    }
  }
}
