import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { PaginationComponent } from '../../shared/pagination.component';
import { errorMessage } from '../../shared/error-message';
import { addDays, parseLocal, toLocalDateTime } from '../../shared/calendar-dates';

interface Riga {
  id: number;
  quando: string;
  username?: string;
  ruolo?: string;
  azione: string;
  risorsa?: string;
  risorsaId?: string;
  esito: 'OK' | 'NEGATO' | 'RIFIUTATO' | 'ERRORE';
  codiceHttp?: number;
  ip?: string;
  dettaglio?: string;
}

interface Pagina {
  content: Riga[];
  totalElements: number;
}

const AZIONI: Record<string, string> = {
  LOGIN: 'Accesso',
  LOGIN_FALLITO: 'Accesso fallito',
  LOGIN_BLOCCATO: 'Accesso bloccato',
  CAMBIO_PASSWORD: 'Cambio password',
  CREA: 'Creazione',
  MODIFICA: 'Modifica',
  ELIMINA: 'Eliminazione',
  ESPORTA: 'Esportazione'
};

const ESITI: Record<string, string> = {
  OK: 'Eseguita',
  NEGATO: 'Negata',
  RIFIUTATO: 'Rifiutata',
  ERRORE: 'Errore'
};

@Component({
  selector: 'app-registro-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Registro attività</h1>
        <p class="hint">Accessi e operazioni di scrittura degli utenti, con le richieste negate. Non contiene i dati inviati né le password e non è modificabile.</p>
      </header>
      <div *ngIf="error" class="error-block" role="alert">⚠️ {{ error }}</div>

      <div class="card">
        <form class="filters" (ngSubmit)="cerca()">
          <label>Utente<input class="form-control" name="username" [(ngModel)]="username" placeholder="Cerca per username"></label>
          <label>Azione
            <select class="form-control" name="azione" [(ngModel)]="azione">
              <option value="">Tutte</option>
              <option *ngFor="let a of azioniElenco" [value]="a.value">{{ a.label }}</option>
            </select>
          </label>
          <label>Esito
            <select class="form-control" name="esito" [(ngModel)]="esito">
              <option value="">Tutti</option>
              <option *ngFor="let e of esitiElenco" [value]="e.value">{{ e.label }}</option>
            </select>
          </label>
          <label>Dal<input class="form-control" type="date" name="da" [(ngModel)]="da"></label>
          <label>Al<input class="form-control" type="date" name="a" [(ngModel)]="a"></label>
          <div class="buttons">
            <button class="btn btn-primary">Cerca</button>
            <button type="button" class="btn btn-secondary" (click)="azzera()">Azzera</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <table *ngIf="!loading && righe.length" class="data-table">
          <thead><tr><th>Data e ora</th><th>Utente</th><th>Azione</th><th>Su cosa</th><th>Esito</th><th>Indirizzo</th><th>Note</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of righe">
              <td class="nowrap">{{ r.quando | date:'dd/MM/yyyy HH:mm:ss' }}</td>
              <td>{{ r.username || '—' }} <small *ngIf="r.ruolo" class="muted">{{ r.ruolo === 'ADMIN' ? 'admin' : 'viewer' }}</small></td>
              <td>{{ etichettaAzione(r.azione) }}</td>
              <td>{{ r.risorsa }}<span *ngIf="r.risorsaId"> #{{ r.risorsaId }}</span></td>
              <td><span class="badge" [ngClass]="'e-' + r.esito.toLowerCase()" [title]="r.codiceHttp ? 'HTTP ' + r.codiceHttp : ''">{{ etichettaEsito(r.esito) }}</span></td>
              <td class="muted">{{ r.ip }}</td>
              <td class="muted">{{ r.dettaglio }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="!loading && !righe.length && !error" class="empty">Nessuna attività trovata.</p>
        <app-pagination *ngIf="!loading" [totalItems]="totale" [page]="pagina" [pageSize]="dimensione" [pageSizes]="[25, 50, 100]" label="eventi"
          (pageChange)="vaiA($event)" (pageSizeChange)="cambiaDimensione($event)"></app-pagination>
      </div>
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 16px; } h1 { font-size: 22px; } .hint { color: var(--muted); margin-top: 4px; }
    .card { margin-bottom: 20px; padding: 20px; background: var(--surface); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.08); overflow-x: auto; }
    .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; }
    label { display: grid; gap: 6px; font-weight: 600; font-size: 13px; color: var(--muted); }
    .form-control { padding: 9px 12px; border: 1px solid var(--field); border-radius: 6px; font: inherit; width: 100%; background: var(--surface); color: var(--ink); }
    .buttons { display: flex; gap: 8px; }
    .btn { padding: 8px 14px; border: 0; border-radius: 6px; cursor: pointer; font: inherit; font-weight: 500; }
    .btn-primary { background: var(--petrol); color: #fff; } .btn-secondary { background: var(--line); color: var(--ink); }
    .data-table { width: 100%; border-collapse: collapse; } .data-table th, .data-table td { text-align: left; padding: 8px 9px; border-bottom: 1px solid var(--line); vertical-align: top; }
    .nowrap { white-space: nowrap; } .muted { color: var(--muted); }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .e-ok { background: var(--ok-bg); color: var(--ok); } .e-negato, .e-errore { background: var(--danger-bg); color: var(--danger); } .e-rifiutato { background: var(--warn-bg); color: var(--warn); }
    .error-block { margin-bottom: 12px; padding: 10px 14px; background: var(--danger-bg); color: var(--danger); border-radius: 8px; }
    .loading, .empty { padding: 20px; text-align: center; color: var(--muted); }
  `]
})
export class RegistroPageComponent implements OnInit {
  private http = inject(HttpClient);
  private config = inject(ApiConfiguration);

  readonly azioniElenco = Object.entries(AZIONI).map(([value, label]) => ({ value, label }));
  readonly esitiElenco = Object.entries(ESITI).map(([value, label]) => ({ value, label }));

  username = '';
  azione = '';
  esito = '';
  da = '';
  a = '';
  righe: Riga[] = [];
  totale = 0;
  pagina = 1;
  dimensione = 50;
  loading = false;
  error = '';

  ngOnInit(): Promise<void> { return this.carica(); }

  etichettaAzione(v: string): string { return AZIONI[v] ?? v; }
  etichettaEsito(v: string): string { return ESITI[v] ?? v; }

  cerca(): Promise<void> {
    this.pagina = 1;
    return this.carica();
  }

  azzera(): Promise<void> {
    this.username = this.azione = this.esito = this.da = this.a = '';
    return this.cerca();
  }

  vaiA(pagina: number): Promise<void> {
    this.pagina = pagina;
    return this.carica();
  }

  cambiaDimensione(dimensione: number): Promise<void> {
    this.dimensione = dimensione;
    return this.cerca();
  }

  private async carica(): Promise<void> {
    this.loading = true;
    this.error = '';
    let params = new HttpParams().set('page', this.pagina - 1).set('size', this.dimensione);
    if (this.username.trim()) params = params.set('username', this.username.trim());
    if (this.azione) params = params.set('azione', this.azione);
    if (this.esito) params = params.set('esito', this.esito);
    // Le date scelte sono giorni interi: "al" è inclusivo, quindi il limite esclusivo è la mezzanotte successiva.
    if (this.da) params = params.set('da', toLocalDateTime(parseLocal(this.da)));
    if (this.a) params = params.set('a', toLocalDateTime(addDays(parseLocal(this.a), 1)));
    try {
      const pagina = await firstValueFrom(this.http.get<Pagina>(`${this.config.rootUrl}/api/registro`, { params }));
      this.righe = pagina.content;
      this.totale = pagina.totalElements;
    } catch (e) {
      this.righe = [];
      this.totale = 0;
      this.error = errorMessage(e, 'Errore nel caricamento del registro');
    } finally {
      this.loading = false;
    }
  }
}
