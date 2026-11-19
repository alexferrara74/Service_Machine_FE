import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { AuthService, Ruolo, Utente } from '../../core/auth.service';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-utenti-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>Utenti</h1>
          <p class="hint"><strong>Amministratore</strong>: può fare tutto. <strong>Sola lettura</strong>: può consultare ed esportare, non modificare nulla.</p>
        </div>
      </header>
      <div *ngIf="error" class="error-block" role="alert">⚠️ {{ error }}</div>

      <div class="card">
        <h2>Nuovo utente</h2>
        <form (ngSubmit)="create()" class="grid" autocomplete="off">
          <label>Username<input class="form-control" name="username" [(ngModel)]="nuovo.username" maxlength="50" required></label>
          <label>Password (almeno 10 caratteri)<input class="form-control" type="password" name="password" [(ngModel)]="nuovo.password" autocomplete="new-password" required></label>
          <label>Ruolo
            <select class="form-control" name="ruolo" [(ngModel)]="nuovo.ruolo">
              <option value="VIEWER">Sola lettura</option>
              <option value="TECNICO">Tecnico (appuntamenti)</option>
              <option value="ADMIN">Amministratore</option>
            </select>
          </label>
          <div class="submit"><button class="btn btn-primary" [disabled]="creating">{{ creating ? 'Creazione...' : 'Crea utente' }}</button></div>
        </form>
      </div>

      <div class="card">
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <table *ngIf="!loading" class="data-table">
          <thead><tr><th>Username</th><th>Ruolo</th><th>Stato</th><th>Ultimo accesso</th><th>Azioni</th></tr></thead>
          <tbody>
            <tr *ngFor="let u of utenti" [class.off]="!u.attivo">
              <td>{{ u.username }} <span *ngIf="u.username === auth.username()" class="me">(tu)</span></td>
              <td>
                <select class="form-control sm" [ngModel]="u.ruolo" (ngModelChange)="cambiaRuolo(u, $event)" [disabled]="u.username === auth.username()" [attr.aria-label]="'Ruolo di ' + u.username">
                  <option value="VIEWER">Sola lettura</option>
                  <option value="TECNICO">Tecnico (appuntamenti)</option>
                  <option value="ADMIN">Amministratore</option>
                </select>
              </td>
              <td><span class="badge" [class.ok]="u.attivo">{{ u.attivo ? 'Attivo' : 'Disattivato' }}</span></td>
              <td>{{ u.ultimoAccesso ? (u.ultimoAccesso | date:'dd/MM/yyyy HH:mm') : 'mai' }}</td>
              <td class="actions">
                <button class="btn btn-secondary" (click)="toggleAttivo(u)" [disabled]="u.username === auth.username()">{{ u.attivo ? 'Disattiva' : 'Riattiva' }}</button>
                <button class="btn btn-secondary" (click)="resetPassword(u)">Reimposta password</button>
                <button class="btn btn-danger" (click)="remove(u)" [disabled]="u.username === auth.username()">Elimina</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 16px; } h1 { font-size: 22px; } h2 { font-size: 17px; margin-bottom: 12px; } .hint { color: var(--muted); margin-top: 4px; }
    .card { margin-bottom: 20px; padding: 20px; background: var(--surface); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.08); overflow-x: auto; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; align-items: end; }
    label { display: grid; gap: 6px; font-weight: 600; font-size: 13px; color: var(--muted); }
    .form-control { padding: 9px 12px; border: 1px solid var(--field); border-radius: 6px; font: inherit; width: 100%; background: var(--surface); color: var(--ink); }
    .form-control.sm { padding: 6px 8px; width: auto; }
    .btn { padding: 7px 12px; border: 0; border-radius: 6px; cursor: pointer; font: inherit; font-weight: 500; } .btn:disabled { opacity: .45; cursor: not-allowed; }
    .btn-primary { background: var(--petrol); color: #fff; } .btn-secondary { background: var(--line); color: var(--ink); } .btn-danger { background: var(--danger); color: #fff; }
    .data-table { width: 100%; border-collapse: collapse; } .data-table th, .data-table td { text-align: left; padding: 9px; border-bottom: 1px solid var(--line); }
    tr.off td { color: var(--muted); } .me { color: var(--muted); font-size: 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge { padding: 2px 8px; border-radius: 999px; background: var(--line); font-size: 12px; } .badge.ok { background: var(--ok-bg); color: var(--ok); }
    .error-block { margin-bottom: 12px; padding: 10px 14px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; }
    .loading { padding: 20px; text-align: center; color: var(--muted); }
  `]
})
export class UtentiPageComponent implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private config = inject(ApiConfiguration);

  utenti: Utente[] = [];
  loading = false;
  creating = false;
  error = '';
  nuovo: { username: string; password: string; ruolo: Ruolo } = { username: '', password: '', ruolo: 'VIEWER' };

  private get url(): string { return `${this.config.rootUrl}/api/utenti`; }

  ngOnInit(): Promise<void> { return this.load(); }

  async load(): Promise<void> {
    this.loading = true;
    try { this.utenti = await firstValueFrom(this.http.get<Utente[]>(this.url)); }
    catch (e) { this.error = errorMessage(e, 'Errore nel caricamento degli utenti'); }
    finally { this.loading = false; }
  }

  async create(): Promise<void> {
    if (this.creating) return;
    this.creating = true;
    this.error = '';
    try {
      await firstValueFrom(this.http.post<Utente>(this.url, this.nuovo));
      this.nuovo = { username: '', password: '', ruolo: 'VIEWER' };
      await this.load();
    } catch (e) { this.error = errorMessage(e, 'Errore nella creazione dell’utente'); }
    finally { this.creating = false; }
  }

  private async aggiorna(u: Utente, ruolo: Ruolo, attivo: boolean, nuovaPassword?: string): Promise<void> {
    this.error = '';
    try {
      await firstValueFrom(this.http.put<Utente>(`${this.url}/${u.id}`, { ruolo, attivo, nuovaPassword }));
    } catch (e) { this.error = errorMessage(e, 'Errore nell’aggiornamento dell’utente'); }
    await this.load();
  }

  cambiaRuolo(u: Utente, ruolo: Ruolo): Promise<void> { return this.aggiorna(u, ruolo, u.attivo); }

  toggleAttivo(u: Utente): Promise<void> { return this.aggiorna(u, u.ruolo, !u.attivo); }

  async resetPassword(u: Utente): Promise<void> {
    const pwd = prompt(`Nuova password per ${u.username} (almeno 10 caratteri).\nLe sue sessioni aperte verranno chiuse.`);
    if (pwd) await this.aggiorna(u, u.ruolo, u.attivo, pwd);
  }

  async remove(u: Utente): Promise<void> {
    if (!confirm(`Eliminare l’utente ${u.username}? L’operazione non è reversibile.`)) return;
    this.error = '';
    try { await firstValueFrom(this.http.delete<void>(`${this.url}/${u.id}`)); }
    catch (e) { this.error = errorMessage(e, 'Errore nell’eliminazione dell’utente'); }
    await this.load();
  }
}
