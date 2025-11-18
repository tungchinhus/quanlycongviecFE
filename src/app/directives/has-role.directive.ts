import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService, UserRole } from '../services/auth.service';

@Directive({
  selector: '[appHasRole]'
})
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef<any>);
  private readonly vcr = inject(ViewContainerRef);

  private requiredAll: (UserRole | string)[] = [];
  private requiredAny: (UserRole | string)[] = [];

  constructor() {
    effect(() => {
      // re-evaluate when user changes
      this.updateView();
    });
  }

  @Input('appHasRole') set setAll(roles: (UserRole | string)[] | UserRole | string) {
    this.requiredAll = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  @Input('appHasRoleAny') set setAny(roles: (UserRole | string)[] | UserRole | string) {
    this.requiredAny = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  private updateView(): void {
    const allOk = this.requiredAll.length === 0 || this.auth.hasRole(this.requiredAll);
    const anyOk = this.requiredAny.length === 0 || this.auth.hasAnyRole(this.requiredAny);
    const allowed = allOk && anyOk;

    this.vcr.clear();
    if (allowed) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}


