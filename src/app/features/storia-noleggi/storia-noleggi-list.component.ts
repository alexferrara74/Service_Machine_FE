import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoriaNoleggiService } from '../../api/services/storia-noleggi.service';
import { StoriaNoleggiPaginatiService } from '../../api/services/storia-noleggi-paginati.service';
import { PageResponse } from '../../api/models/page-response';
import { StoriaNoleggioResponse } from '../../api/models/storia-noleggio-response';
import { CatalogoProdottiService } from '../catalogo/catalogo-prodotti.service';
import { ProdottoCatalogo } from '../catalogo/prodotto-catalogo';
import { StoriaNoleggiManutenzioniService } from '../../api/services/storia-noleggi-manutenzioni.service';
import { NoleggioManutenzioneResponse } from '../../api/models/noleggio-manutenzione-response';
import { NoleggioManutenzioneEventoResponse } from '../../api/models/noleggio-manutenzione-evento-response';
import { PaginationComponent } from '../../shared/pagination.component';

interface RentalMaintenanceRow {
  rental: StoriaNoleggioResponse;
  state?: NoleggioManutenzioneResponse;
  events: NoleggioManutenzioneEventoResponse[];
  error: string;
  saving: boolean;
  saved?: string;
}

@Component({
  selector: 'app-storia-noleggi-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PaginationComponent],
  template: `
<div class="page">
  <div class="page-header">
    <div class="page-title">
      <span class="page-icon" aria-hidden="true">📋</span>
      <div>
        <h1>Noleggi</h1>
        <p>Consulta i noleggi e tieni sotto controllo le manutenzioni degli apparecchi.</p>
      </div>
    </div>
    <button class="btn btn-primary" (click)="create()">+ Nuovo</button>
  </div>
  <nav class="tabs" aria-label="Sezioni noleggi">
    <button type="button" [class.active]="activeTab === 'history'" (click)="activeTab = 'history'">Noleggi</button>
    <button type="button" [class.active]="activeTab === 'maintenance'" (click)="activeTab = 'maintenance'">Manutenzioni</button>
  </nav>
  <div *ngIf="activeTab === 'history'" class="card">
    <form class="search-bar" (ngSubmit)="filterFromApi()">
      <select [(ngModel)]="apiFilter" name="apiFilter" class="search-input">
        <option value="matricola">Per matricola</option>
        <option value="cliente">Per cliente ID</option>
        <option value="articolo">Per articolo ID</option>
      </select>
      <input
        [type]="apiFilter === 'matricola' ? 'text' : 'number'"
        [placeholder]="apiFilter === 'matricola' ? 'Matricola' : apiFilter === 'cliente' ? 'Cliente ID' : 'Articolo ID'"
        [(ngModel)]="apiFilterValue"
        name="apiFilterValue"
        class="search-input" />
      <button type="submit" class="btn btn-secondary">Cerca</button>
      <button type="button" class="btn btn-secondary" (click)="clearFilter()">Tutti</button>
    </form>
    <div *ngIf="loading" class="loading">⏳ Caricamento...</div>
    <div *ngIf="error" class="error-block">⚠️ {{ error }}</div>
    <div *ngIf="!loading && !error">
      <div *ngIf="filtered.length === 0" class="empty-state">Nessun noleggio trovato.</div>
      <div *ngIf="filtered.length > 0" class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Doc ID</th><th>Cliente ID</th><th>Articolo</th><th>Matricola</th><th>Quantità</th><th>Data Doc</th><th>Sezionale</th><th>Azioni</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of items">
            <td>{{ item.docId }}</td>
            <td>{{ item.clienteId }}</td>
            <td>{{ articleInfo(item) }}</td>
            <td>{{ item.matricola }}</td>
            <td>{{ item.quantita }}</td>
            <td>{{ item.dataDoc }}</td>
            <td>{{ item.sezionale }}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" (click)="edit(item)">✏️ Modifica</button>
              <button class="btn btn-sm btn-danger" (click)="deleteItem(item)">🗑️ Elimina</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <app-pagination
        *ngIf="!loading && !error"
        [totalItems]="totalElements"
        [page]="historyPage"
        [pageSize]="pageSize"
        label="noleggi"
        (pageChange)="goToHistoryPage($event)"
        (pageSizeChange)="changePageSize($event)">
      </app-pagination>
    </div>
    <div *ngIf="articleError" class="article-warning">⚠️ {{ articleError }}</div>
  </div>
  <section *ngIf="activeTab === 'maintenance'" class="card">
    <div class="maintenance-header">
      <h2>Monitoraggio manutenzioni</h2>
      <button type="button" class="btn btn-secondary" [disabled]="loading" (click)="refresh()">Aggiorna</button>
    </div>
    <p class="maintenance-note">
      La pianificazione è impostata una volta nella scheda cliente e vale per tutti i suoi noleggi.
      Scadenze e storico degli interventi sono mostrati separatamente per ogni attrezzatura.
    </p>
    <div *ngIf="loading" class="loading">⏳ Caricamento...</div>
    <div *ngIf="!loading && maintenanceRows.length === 0" class="empty-state">
      Nessun noleggio disponibile.
    </div>
    <div *ngIf="!loading && maintenanceRows.length" class="table-wrap">
    <table class="data-table maintenance-table">
      <thead>
      <tr><th>Cliente</th><th>Matricola</th><th>Prossima manutenzione</th><th>Intervallo attivo</th><th>Ultima manutenzione</th><th>Stato</th><th>Storico interventi</th><th>Azioni</th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let row of paginatedMaintenanceRows">
          <td>
            <a *ngIf="row.state" [routerLink]="['/clienti', row.state.clienteId]">{{ row.state.cliente }}</a>
            <span *ngIf="!row.state">Cliente {{ row.rental.clienteId }}</span>
            <small>Doc {{ row.rental.docId }}</small>
          </td>
          <td>
            {{ row.state?.matricola ?? row.rental.matricola ?? '—' }}
            <small *ngIf="row.state?.articoloId">Articolo {{ row.state?.articoloId }}</small>
          </td>
          <td>
            {{ row.state?.prossimaManutenzioneIl ? (row.state?.prossimaManutenzioneIl | date:'dd/MM/yyyy':'UTC') : '—' }}
            <small *ngIf="row.state?.giorniAllaManutenzione !== null && row.state?.giorniAllaManutenzione !== undefined">
              {{ daysLabel(row.state) }}
            </small>
          </td>
          <td>{{ row.state?.intervalloManutenzioneGiorni ? row.state?.intervalloManutenzioneGiorni + ' giorni' : '—' }}</td>
          <td>{{ row.state?.ultimaManutenzioneIl ? (row.state?.ultimaManutenzioneIl | date:'short') : 'Mai registrata' }}</td>
          <td>
            <span *ngIf="row.error" class="status status-alert">{{ row.error }}</span>
            <span *ngIf="!row.error && row.state?.statoManutenzione === 'NON_CONFIGURATA'" class="status">Pianificazione richiesta</span>
            <span *ngIf="!row.error && row.state?.statoManutenzione === 'PROGRAMMATA'" class="status status-ok">Programmata</span>
            <span *ngIf="!row.error && row.state?.statoManutenzione === 'IN_SCADENZA'" class="status status-alert">In scadenza</span>
            <span *ngIf="!row.error && row.state?.statoManutenzione === 'IN_RITARDO'" class="status status-alert">In ritardo</span>
            <span *ngIf="row.saved" class="status status-ok">{{ row.saved }}</span>
            <span *ngIf="!row.state" class="status">Stato non disponibile</span>
          </td>
          <td>
            <details *ngIf="row.events.length">
              <summary>{{ row.events.length }} interventi</summary>
              <ul class="event-list">
                <li *ngFor="let event of row.events">
                  {{ event.tipo }} · {{ event.eseguitaIl | date:'short' }}
                  <span *ngIf="event.note"> · {{ event.note }}</span>
                </li>
              </ul>
            </details>
            <span *ngIf="!row.events.length">Nessuno</span>
          </td>
          <td class="actions">
            <button
              *ngIf="row.state?.manutenzioneDovuta && row.state?.tipoManutenzioneDovuta !== 'STRAORDINARIA'"
              class="btn btn-sm btn-secondary"
              [disabled]="row.saving"
              (click)="registerMaintenance(row)">
              {{ row.saving ? 'Registrazione...' : 'Registra ordinaria' }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-danger"
              [disabled]="row.saving"
              (click)="registerExtraordinaryMaintenance(row)">
              {{ row.saving ? 'Registrazione...' : 'Registra straordinaria' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
    <app-pagination
      *ngIf="!loading"
      [totalItems]="totalElements"
      [page]="historyPage"
      [pageSize]="pageSize"
      label="noleggi"
      (pageChange)="goToHistoryPage($event)"
      (pageSizeChange)="changePageSize($event)">
    </app-pagination>
  </section>
</div>`,
  styles: [`
.page{--ink:#172b4d;--muted:#66758b;--line:#e5ebf3;--blue:#2563eb;--blue-dark:#1d4ed8;--surface:#fff;padding:0;color:var(--ink);animation:page-in .35s ease-out}
.page-header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:22px}.maintenance-header{margin-bottom:12px}
.page-title{display:flex;align-items:center;gap:14px}.page-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#dbeafe,#eff6ff);font-size:23px;box-shadow:inset 0 0 0 1px #bfdbfe}
.page-header h1{font-size:25px;letter-spacing:-.45px;font-weight:750;color:var(--ink)}.page-header p{margin-top:5px;color:var(--muted);font-size:13px}
.card{background:var(--surface);border:1px solid #edf1f7;border-radius:16px;box-shadow:0 8px 24px #172b4d0a;padding:24px;animation:panel-in .3s ease-out}
.search-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.search-bar+.search-bar{margin-top:2px}
.search-input{width:auto;min-width:180px;max-width:400px;padding:10px 13px;border:1px solid #d8e0eb;border-radius:9px;background:#fff;color:var(--ink);font-size:13px;outline:none;transition:border-color .18s,box-shadow .18s}
.search-input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.search-input::placeholder{color:#9aa8ba}
.table-wrap{width:100%;overflow:auto;border:1px solid var(--line);border-radius:12px;margin-top:14px}
.data-table{width:100%;border-collapse:separate;border-spacing:0;min-width:850px}.data-table th{position:sticky;top:0;background:#f5f8fc;text-align:left;padding:12px 14px;font-size:11px;letter-spacing:.045em;text-transform:uppercase;font-weight:700;color:#66758b;border-bottom:1px solid #e2e8f0;white-space:nowrap}
.data-table td{padding:13px 14px;border-bottom:1px solid #edf1f6;color:#334155;vertical-align:middle;font-size:13px}.data-table tbody tr:last-child td{border-bottom:0}.data-table tbody tr{transition:background .15s}.data-table tbody tr:nth-child(even){background:#fbfcfe}.data-table tbody tr:hover{background:#f1f7ff}
td.actions{white-space:nowrap}td.actions .btn+.btn{margin-left:8px}.empty-state{text-align:center;padding:48px 20px;color:#8190a5;background:linear-gradient(180deg,#fbfdff,#fff);border:1px dashed #dce5f0;border-radius:12px}
.loading{text-align:center;padding:40px;color:var(--muted)}
.error-block{background:#fff1f0;color:#b42318;border:1px solid #ffd5d2;padding:12px 16px;border-radius:10px;margin:12px 0}
.article-warning{background:#fff8eb;color:#9a5b00;border:1px solid #fde2ad;padding:10px 14px;border-radius:9px;margin-top:12px}
.btn{padding:9px 14px;border-radius:9px;border:1px solid transparent;cursor:pointer;font-size:13px;font-weight:650;transition:transform .16s,box-shadow .16s,background .16s,opacity .16s}
.btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 10px #172b4d18}.btn:active:not(:disabled){transform:translateY(0)}.btn:disabled{opacity:.55;cursor:not-allowed}
.btn-primary{background:linear-gradient(135deg,#3478f6,#205bd7);color:#fff;box-shadow:0 4px 10px #2563eb2b}.btn-secondary{background:#f1f5f9;color:#334155;border-color:#e5eaf1}.btn-secondary:hover:not(:disabled){background:#e8eef7}.btn-danger{background:#fff1f0;color:#c43227;border-color:#ffd5d2}.btn-danger:hover:not(:disabled){background:#ffe5e2}.btn-sm{padding:7px 10px;font-size:12px}
.tabs{display:flex;gap:5px;margin-bottom:15px;padding:5px;width:max-content;max-width:100%;border:1px solid #e6ebf2;border-radius:12px;background:#eef2f7}
.tabs button{display:flex;align-items:center;justify-content:center;padding:9px 16px;border:0;border-radius:8px;background:transparent;color:#64748b;cursor:pointer;font-size:13px;font-weight:650;transition:background .18s,color .18s,box-shadow .18s}
.tabs button:hover:not(.active){color:#334155;background:#ffffff90}.tabs button.active{color:#1d4ed8;background:#fff;box-shadow:0 2px 7px #172b4d14}
.maintenance-header{display:flex;align-items:center;justify-content:space-between;gap:12px}.maintenance-header h2{font-size:18px;letter-spacing:-.2px}
.maintenance-note{max-width:820px;color:var(--muted);font-size:13px;line-height:1.6;margin:8px 0 18px}
.maintenance-table{min-width:1120px}.maintenance-table td:first-child{font-weight:650}.maintenance-table small{display:block;color:#8190a5;margin-top:4px;font-size:11px}.maintenance-table a{color:#245fc5;text-decoration:none}.maintenance-table a:hover{text-decoration:underline}
.status{display:inline-flex;align-items:center;padding:6px 9px;border-radius:999px;font-size:11px;line-height:1.35;font-weight:700;background:#f1f5f9;color:#536277;white-space:normal;min-width:max-content}
.status-ok{background:#e9f8ef;color:#168047}.status-alert{background:#fff3df;color:#a65b00}.event-list{min-width:260px;padding:8px 0 0 18px}.event-list li{margin:7px 0;font-size:12px;color:#475569}
@keyframes page-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}@keyframes panel-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:700px){.page-header{align-items:flex-start}.page-title{align-items:flex-start}.page-icon{width:42px;height:42px}.page-header h1{font-size:21px}.page-header p{max-width:320px;line-height:1.45}.card{padding:16px}.search-bar{align-items:stretch}.search-input{flex:1;min-width:0;max-width:none}.tabs{width:100%}.tabs button{flex:1;padding:9px 8px;font-size:12px}.maintenance-header{align-items:flex-start}}
`]
})
export class StoriaNoleggioListComponent implements OnInit {
  items: StoriaNoleggioResponse[] = [];
  filtered: StoriaNoleggioResponse[] = [];
  totalElements = 0;
  loading = false;
  error = '';
  articleError = '';
  catalogo = new Map<number, ProdottoCatalogo>();
  apiFilter: 'matricola' | 'cliente' | 'articolo' = 'matricola';
  apiFilterValue = '';
  private activeApiFilter: 'matricola' | 'cliente' | 'articolo' = 'matricola';
  private activeApiFilterValue = '';
  activeTab: 'history' | 'maintenance' = 'history';
  pageSize = 10;
  historyPage = 1;
  maintenanceRows: RentalMaintenanceRow[] = [];

  constructor(
    private service: StoriaNoleggiService,
    private paginatedService: StoriaNoleggiPaginatiService,
    private catalogoService: CatalogoProdottiService,
    private maintenanceService: StoriaNoleggiManutenzioniService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([this.load(), this.loadCatalogo()]);
  }

  async loadMaintenanceRows(): Promise<void> {
    this.maintenanceRows = [];
    this.maintenanceRows = await Promise.all(this.items
      .filter(rental => rental.docId !== undefined)
      .map(async rental => {
        const row: RentalMaintenanceRow = { rental, events: [], error: '', saving: false };
        try {
          [row.state, row.events] = await Promise.all([
            this.maintenanceService.getStato(rental.docId!),
            this.maintenanceService.getEventi(rental.docId!)
          ]);
        } catch (error) {
          row.error = this.message(error, 'Errore nel caricamento dello stato manutenzione');
        }
        return row;
      }));
  }

  async registerMaintenance(row: RentalMaintenanceRow): Promise<void> {
    if (row.rental.docId === undefined) return;
    row.saving = true;
    row.error = '';
    row.saved = '';
    try {
      await this.maintenanceService.registraManutenzione(row.rental.docId);
      row.saved = 'Ordinaria registrata';
    } catch (error) {
      row.error = this.message(error, 'Errore nella registrazione della manutenzione');
      row.saving = false;
      return;
    }
    try {
      [row.state, row.events] = await Promise.all([
        this.maintenanceService.getStato(row.rental.docId),
        this.maintenanceService.getEventi(row.rental.docId)
      ]);
    } catch (error) {
      row.error = `Manutenzione registrata, ma aggiornamento dello stato non riuscito: ${this.message(error, 'errore di caricamento')}`;
    } finally {
      row.saving = false;
    }
  }

  async registerExtraordinaryMaintenance(row: RentalMaintenanceRow): Promise<void> {
    if (row.rental.docId === undefined) return;
    const note = prompt('Descrivi il guasto o l’intervento straordinario:', '');
    if (note === null) return;
    row.saving = true;
    row.error = '';
    row.saved = '';
    try {
      await this.maintenanceService.registraStraordinaria(row.rental.docId, note.trim());
      [row.state, row.events] = await Promise.all([
        this.maintenanceService.getStato(row.rental.docId),
        this.maintenanceService.getEventi(row.rental.docId)
      ]);
      row.saved = 'Straordinaria registrata';
    } catch (error) {
      row.error = this.message(error, 'Errore nella registrazione della manutenzione straordinaria');
    } finally {
      row.saving = false;
    }
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  async load(page = 1): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      await this.fetchPage(page, false);
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel caricamento dei dati';
    } finally {
      this.loading = false;
    }
  }

  async loadCatalogo(): Promise<void> {
    this.articleError = '';
    try {
      this.catalogo = new Map((await this.catalogoService.getAll()).map(p => [p.articoloId, p]));
    } catch (e: any) {
      this.articleError = e?.message ?? 'Impossibile recuperare i dettagli del prodotto';
    }
  }

  articleInfo(item: StoriaNoleggioResponse): string {
    const articleId = item.articoloId;
    if (articleId === undefined) return '—';
    const article = this.catalogo.get(articleId);
    const label = article ? [article.codice, article.descrizione].filter(Boolean).join(' — ') : '';
    if (!label) return `Prodotto non trovato (ID ${articleId})`;
    return `${label} (ID ${articleId})`;
  }

  get paginatedMaintenanceRows(): RentalMaintenanceRow[] {
    return this.maintenanceRows;
  }

  daysLabel(state?: NoleggioManutenzioneResponse): string {
    const days = state?.giorniAllaManutenzione;
    return days !== null && days !== undefined && days < 0
      ? `In ritardo di ${Math.abs(days)} giorni`
      : `Tra ${days ?? 0} giorni`;
  }

  async refresh(): Promise<void> {
    await this.fetchCurrentFilterPage(this.historyPage);
  }

  async goToHistoryPage(page: number): Promise<void> {
    await this.fetchCurrentFilterPage(page);
  }

  async changePageSize(size: number): Promise<void> {
    this.pageSize = size;
    await this.fetchCurrentFilterPage(1);
  }

  async filterFromApi(): Promise<void> {
    const value = this.apiFilterValue.trim();
    if (!value) {
      await this.clearFilter();
      return;
    }
    if (this.apiFilter !== 'matricola' && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
      this.error = 'Inserisci un ID numerico valido per il filtro selezionato.';
      return;
    }
    this.activeApiFilter = this.apiFilter;
    this.activeApiFilterValue = value;
    await this.fetchCurrentFilterPage(1);
  }

  async clearFilter(): Promise<void> {
    this.apiFilterValue = '';
    this.activeApiFilterValue = '';
    await this.load(1);
  }

  private async fetchCurrentFilterPage(page: number): Promise<void> {
    const value = this.activeApiFilterValue;
    if (!value) {
      this.loading = true;
      this.error = '';
      try {
        await this.fetchPage(page, false);
      } catch (error) {
        this.error = this.message(error, 'Errore nel caricamento dei dati');
      } finally {
        this.loading = false;
      }
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.fetchPage(page, true);
    } catch (error) {
      this.error = this.message(error, 'Errore nella ricerca dei noleggi');
    } finally {
      this.loading = false;
    }
  }

  private async fetchPage(page: number, useFilter: boolean): Promise<void> {
    const value = useFilter ? this.activeApiFilterValue : '';
    const requestPage = (zeroBasedPage: number): Promise<PageResponse<StoriaNoleggioResponse>> => {
      if (!value) return this.paginatedService.getPage(zeroBasedPage, this.pageSize);
      if (this.activeApiFilter === 'matricola') {
        return this.paginatedService.getPageByMatricola(value, zeroBasedPage, this.pageSize);
      }
      if (this.activeApiFilter === 'cliente') {
        return this.paginatedService.getPageByCliente(Number(value), zeroBasedPage, this.pageSize);
      }
      return this.paginatedService.getPageByArticolo(Number(value), zeroBasedPage, this.pageSize);
    };

    let response = await requestPage(Math.max(0, page - 1));
    if (response.totalPages > 0 && response.page >= response.totalPages) {
      response = await requestPage(response.totalPages - 1);
    }
    this.items = response.content;
    this.filtered = response.content;
    this.totalElements = response.totalElements;
    this.historyPage = response.page + 1;
    await this.loadMaintenanceRows();
  }

  create(): void {
    this.router.navigate(['/noleggi/new']);
  }

  edit(item: StoriaNoleggioResponse): void {
    this.router.navigate(['/noleggi', item.docId]);
  }

  async deleteItem(item: StoriaNoleggioResponse): Promise<void> {
    if (!confirm(`Eliminare il noleggio con DocID "${item.docId}"?`)) return;
    try {
      await this.service.delete1({ docId: item.docId! });
      await this.refresh();
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nell\'eliminazione';
    }
  }
}
