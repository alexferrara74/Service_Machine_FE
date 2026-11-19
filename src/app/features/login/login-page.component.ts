import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="login">
      <form class="box" (ngSubmit)="submit()" autocomplete="on">
        <div class="brand"><span class="plate" aria-hidden="true">SP</span><span>Servizi Pilot</span></div>
        <h1>Accedi</h1>
        <p *ngIf="error" class="error" role="alert">⚠️ {{ error }}</p>
        <label>Username
          <input class="form-control" name="username" [(ngModel)]="username" autocomplete="username" autofocus required>
        </label>
        <label>Password
          <input class="form-control" name="password" type="password" [(ngModel)]="password" autocomplete="current-password" required>
        </label>
        <button class="btn btn-primary" [disabled]="loading || !username || !password">{{ loading ? 'Accesso...' : 'Accedi' }}</button>
      </form>
    </main>
  `,
  styles: [`
    .login { min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--paper); }
    .box { width: min(380px, 100%); display: grid; gap: 14px; padding: 28px; background: var(--surface); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,.1); }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 600; color: var(--petrol); }
    .plate { display: grid; place-items: center; width: 36px; height: 26px; background: var(--signal); color: var(--ink); font-size: 13px; font-weight: 700; border-radius: 3px; }
    h1 { font-size: 22px; margin: 0; }
    label { display: grid; gap: 6px; font-weight: 600; font-size: 13px; color: var(--muted); }
    .form-control { padding: 10px 12px; border: 1px solid var(--field); border-radius: 6px; font: inherit; width: 100%; }
    .btn { padding: 10px 16px; border: 0; border-radius: 6px; font: inherit; font-weight: 500; cursor: pointer; }
    .btn-primary { background: var(--petrol); color: #fff; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .error { padding: 10px 12px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; margin: 0; }
  `]
})
export class LoginPageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  loading = false;
  error = '';

  async submit(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      await this.auth.login(this.username.trim(), this.password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      // Solo percorsi interni: un redirect assoluto sarebbe un open redirect.
      await this.router.navigateByUrl(redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/');
    } catch (e) {
      this.password = '';
      this.error = e instanceof HttpErrorResponse && e.status === 401
        ? 'Username o password non corretti.'
        : errorMessage(e, 'Impossibile accedere');
    } finally {
      this.loading = false;
    }
  }
}
