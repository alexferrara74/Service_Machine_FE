import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Il mio account</h1>
      </header>
      <div class="card">
        <p>Utente <strong>{{ auth.username() }}</strong> · ruolo <strong>{{ auth.ruoloEtichetta() }}</strong></p>
        <h2>Cambia password</h2>
        <p class="hint">Dopo il cambio le altre sessioni aperte con la vecchia password vengono chiuse.</p>
        <div *ngIf="error" class="error-block" role="alert">⚠️ {{ error }}</div>
        <div *ngIf="done" class="success-block" role="status">Password aggiornata.</div>
        <form (ngSubmit)="save()" class="grid">
          <label>Password attuale<input class="form-control" type="password" name="attuale" [(ngModel)]="attuale" autocomplete="current-password" required></label>
          <label>Nuova password (almeno 10 caratteri)<input class="form-control" type="password" name="nuova" [(ngModel)]="nuova" autocomplete="new-password" required></label>
          <label>Ripeti la nuova password<input class="form-control" type="password" name="conferma" [(ngModel)]="conferma" autocomplete="new-password" required></label>
          <div><button class="btn btn-primary" [disabled]="saving">{{ saving ? 'Salvataggio...' : 'Aggiorna password' }}</button></div>
        </form>
      </div>
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 20px; } h1 { font-size: 22px; }
    .card { max-width: 520px; padding: 24px; background: var(--surface); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    h2 { font-size: 17px; margin: 18px 0 4px; } .hint { color: var(--muted); margin-bottom: 12px; }
    .grid { display: grid; gap: 14px; } label { display: grid; gap: 6px; font-weight: 600; font-size: 13px; color: var(--muted); }
    .form-control { padding: 10px 12px; border: 1px solid var(--field); border-radius: 6px; font: inherit; width: 100%; }
    .btn { padding: 8px 16px; border: 0; border-radius: 6px; cursor: pointer; font: inherit; font-weight: 500; } .btn-primary { background: var(--petrol); color: #fff; } .btn:disabled { opacity: .5; }
    .error-block { margin-bottom: 12px; padding: 10px 14px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; }
    .success-block { margin-bottom: 12px; padding: 10px 14px; background: var(--ok-bg); color: var(--ok); border-radius: 8px; }
  `]
})
export class AccountPageComponent {
  auth = inject(AuthService);
  attuale = '';
  nuova = '';
  conferma = '';
  saving = false;
  error = '';
  done = false;

  async save(): Promise<void> {
    this.error = '';
    this.done = false;
    if (this.nuova !== this.conferma) { this.error = 'Le due nuove password non coincidono.'; return; }
    if (this.nuova.length < 10) { this.error = 'La nuova password deve avere almeno 10 caratteri.'; return; }
    this.saving = true;
    try {
      await this.auth.cambiaPassword(this.attuale, this.nuova);
      // Il backend ha invalidato i token precedenti, compreso quello in uso: serve un nuovo accesso.
      this.auth.logout();
    } catch (e) {
      this.error = errorMessage(e, 'Errore nel cambio password');
    } finally {
      this.saving = false;
    }
  }
}
