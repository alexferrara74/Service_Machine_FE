import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Appuntamento, AppuntamentiService, StatoAppuntamento } from './appuntamenti.service';
import { StoriaNoleggiService } from '../../api/services/storia-noleggi.service';
import { StoriaNoleggioResponse } from '../../api/models/storia-noleggio-response';
import { errorMessage } from '../../shared/error-message';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-appuntamenti-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Appuntamenti</h1>
        <form *ngIf="auth.isAdmin()" class="nuovo" (ngSubmit)="nuovo()">
          <select class="form-control" [(ngModel)]="noleggioScelto" name="noleggio" aria-label="Noleggio">
            <option [ngValue]="null">Scegli il noleggio…</option>
            <option *ngFor="let n of noleggi" [ngValue]="n.docId">Doc {{ n.docId }} · {{ n.matricola || 'senza matricola' }}</option>
          </select>
          <button class="btn btn-primary" [disabled]="noleggioScelto === null">+ Nuovo appuntamento</button>
        </form>
      </header>
      <nav class="tabs">
        <button type="button" *ngFor="let t of tabs" [class.active]="filtro === t.value" (click)="cambia(t.value)">{{ t.label }}</button>
      </nav>
      <div *ngIf="error" class="error-block">{{ error }}</div>
      <div class="card">
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <div *ngIf="!loading && items.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Data</th><th>Cliente</th><th>Matricola</th><th>Tipo</th><th>Stato</th><th>Esito</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let a of items" [class.ordinaria]="a.tipo === 'ORDINARIA'" [class.straordinaria]="a.tipo === 'STRAORDINARIA'">
                <td>{{ a.dataPrevista | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ a.cliente || '—' }}</td>
                <td>{{ a.matricola || '—' }}<small>Doc {{ a.docId }}</small></td>
                <td><span class="chip" [class.ord]="a.tipo === 'ORDINARIA'" [class.str]="a.tipo === 'STRAORDINARIA'">{{ a.tipo === 'ORDINARIA' ? 'Ordinaria' : 'Straordinaria' }}</span></td>
                <td>{{ statoLabel(a.stato) }}</td>
                <td>{{ a.esito === 'POSITIVO' ? 'Positivo' : a.esito === 'NEGATIVO' ? 'Negativo' : '—' }}<small *ngIf="a.giorniProrogaOrdinaria">Ordinaria +{{ a.giorniProrogaOrdinaria }} gg</small><small *ngIf="a.giorniProrogaStraordinaria">Straordinaria +{{ a.giorniProrogaStraordinaria }} gg</small></td>
                <td><a class="btn btn-secondary" [routerLink]="['/appuntamenti', a.docId, a.id]">Apri</a></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p *ngIf="!loading && !items.length">Nessun appuntamento.</p>
      </div>
    </section>
  `,
  styles: [`
    .page-header,.nuovo{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .page-header{justify-content:space-between;margin-bottom:16px}.page-header h1{margin:0}
    .tabs{display:flex;gap:6px;margin-bottom:14px}
    .tabs button{padding:8px 14px;border:1px solid var(--line);border-radius:8px;background:var(--paper-2);cursor:pointer}
    .tabs button.active{background:var(--petrol);color:#fff;border-color:var(--petrol)}
    .card{padding:20px;background:var(--surface);border-radius:12px;box-shadow:0 2px 8px #00000012}
    .table-wrap{overflow-x:auto}.data-table{width:100%;border-collapse:collapse;min-width:720px}
    .data-table th,.data-table td{text-align:left;padding:10px;border-bottom:1px solid var(--line);border-left:4px solid transparent}
    tr.ordinaria td:first-child{border-left-color:var(--ordinaria)}tr.straordinaria td:first-child{border-left-color:var(--straordinaria)}
    small{display:block;color:var(--muted)}
    .chip{padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;color:#fff}.chip.ord{background:var(--ordinaria)}.chip.str{background:var(--straordinaria)}
    .form-control{padding:9px;border:1px solid var(--field);border-radius:6px}
    .btn{padding:9px 14px;border:0;border-radius:6px;cursor:pointer;text-decoration:none;color:inherit;white-space:nowrap}
    .btn:disabled{opacity:.5;cursor:not-allowed}.btn-primary{background:var(--petrol);color:#fff}.btn-secondary{background:var(--line)}
    .error-block{margin:12px 0;padding:10px;background:var(--danger-bg);color:var(--danger)}.loading{padding:20px;text-align:center}
  `]
})
export class AppuntamentiPageComponent implements OnInit {
  items: Appuntamento[] = [];
  noleggi: StoriaNoleggioResponse[] = [];
  noleggioScelto: number | null = null;
  loading = false;
  error = '';
  filtro: StatoAppuntamento | undefined = 'PROGRAMMATO';
  tabs: { label: string; value: StatoAppuntamento | undefined }[] = [
    { label: 'Da fare', value: 'PROGRAMMATO' }, { label: 'Completati', value: 'COMPLETATO' },
    { label: 'Annullati', value: 'ANNULLATO' }, { label: 'Tutti', value: undefined }
  ];

  readonly auth = inject(AuthService);

  constructor(private service: AppuntamentiService, private noleggiService: StoriaNoleggiService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.noleggiService.getAll1().then(n => this.noleggi = n.filter(x => x.docId !== undefined)).catch(() => { /* serve solo al menu */ });
    await this.carica();
  }

  async cambia(stato: StatoAppuntamento | undefined): Promise<void> { this.filtro = stato; await this.carica(); }

  async carica(): Promise<void> {
    this.loading = true; this.error = '';
    try { this.items = await this.service.agenda(this.filtro); }
    catch (e) { this.error = errorMessage(e, 'Errore nel caricamento degli appuntamenti'); }
    finally { this.loading = false; }
  }

  statoLabel(s: StatoAppuntamento): string { return s === 'PROGRAMMATO' ? 'Da fare' : s === 'COMPLETATO' ? 'Completato' : 'Annullato'; }

  nuovo(): void { if (this.noleggioScelto !== null) this.router.navigate(['/appuntamenti', this.noleggioScelto, 'new']); }
}
