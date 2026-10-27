import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoriaProdottiService } from '../../api/services/storia-prodotti.service';
import { StoriaProdottoRequest } from '../../api/models/storia-prodotto-request';
import { StoriaProdottoResponse } from '../../api/models/storia-prodotto-response';
import { ClientiService } from '../../api/services/clienti.service';
import { ClienteResponse } from '../../api/models/cliente-response';
import { PaginationComponent } from '../../shared/pagination.component';

@Component({
  selector: 'app-storia-prodotti-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <section class="page">
      <header class="page-header"><h1>Prodotti</h1><button class="btn btn-primary" (click)="create()">+ Nuova registrazione</button></header>
      <div *ngIf="error" class="error-block">{{ error }}</div>
      <div *ngIf="customersError" class="warning-block">{{ customersError }}</div>
      <section *ngIf="editing" class="card">
        <h2>{{ isNew ? 'Nuova registrazione prodotto' : 'Modifica registrazione' }}</h2>
        <form (ngSubmit)="save()" class="form-grid">
          <label>Codice articolo<input class="form-control" [(ngModel)]="form.codiceArticolo" name="codice" required></label>
          <label>Articolo ID<input class="form-control" type="number" [(ngModel)]="form.articoloId" name="articolo"></label>
          <label>Cliente
            <select class="form-control" [(ngModel)]="form.clienteId" name="cliente">
              <option [ngValue]="undefined">Seleziona un cliente</option>
              <option *ngIf="form.clienteId !== undefined && !hasCustomer(form.clienteId)" [ngValue]="form.clienteId">
                Cliente {{ form.clienteId }} (dati non disponibili)
              </option>
              <option *ngFor="let customer of customers" [ngValue]="customer.id">{{ customerLabel(customer) }}</option>
            </select>
          </label>
          <label>Categoria ID<input class="form-control" type="number" [(ngModel)]="form.categoriaId" name="categoria"></label>
          <label>Descrizione categoria<input class="form-control" [(ngModel)]="form.categoriaDescrizione" name="categoriaDescrizione"></label>
          <label>Descrizione<input class="form-control" [(ngModel)]="form.descrizione" name="descrizione"></label>
          <label>Quantità<input class="form-control" type="number" [(ngModel)]="form.quantita" name="quantita" required></label>
          <label>Data documento<input class="form-control" type="date" [(ngModel)]="form.dataDoc" name="dataDoc"></label>
          <div class="form-actions">
            <button class="btn btn-primary" [disabled]="saving">{{ saving ? 'Salvataggio...' : 'Salva' }}</button>
            <button type="button" class="btn btn-secondary" (click)="back()">Indietro</button>
            <button *ngIf="!isNew" type="button" class="btn btn-danger" (click)="remove()">Elimina</button>
          </div>
        </form>
      </section>
      <section *ngIf="!editing" class="card">
        <form class="filter-row" (ngSubmit)="filter()">
          <label>Codice articolo<input class="form-control" [(ngModel)]="codeFilter" name="codeFilter"></label>
          <label>Cliente
            <select class="form-control" [(ngModel)]="clienteFilter" name="clienteFilter">
              <option [ngValue]="undefined">Tutti i clienti</option>
              <option *ngFor="let customer of customers" [ngValue]="customer.id">{{ customerLabel(customer) }}</option>
            </select>
          </label>
          <label>Articolo ID<input class="form-control" type="number" [(ngModel)]="articoloFilter" name="articoloFilter"></label>
          <button class="btn btn-secondary">Filtra prodotti</button>
          <button type="button" class="btn btn-secondary" (click)="load()">Tutti</button>
        </form>
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <table *ngIf="!loading && items.length" class="data-table">
          <thead><tr><th>ID</th><th>Codice</th><th>Descrizione</th><th>Cliente</th><th>Articolo</th><th>Categoria</th><th>Quantità</th><th>Data</th><th></th></tr></thead>
          <tbody><tr *ngFor="let item of paginatedItems">
            <td>{{ item.id }}</td><td>{{ item.codiceArticolo }}</td><td>{{ item.descrizione }}</td>
            <td>{{ customerName(item.clienteId) }}<small *ngIf="customerCode(item.clienteId)">Codice: {{ customerCode(item.clienteId) }}</small></td>
            <td>{{ item.articoloId }}</td>
            <td>{{ item.categoriaDescrizione ?? item.categoriaId }}</td><td>{{ item.quantita }}</td><td>{{ item.dataDoc }}</td>
            <td><button class="btn btn-secondary" (click)="edit(item)">Modifica</button></td>
          </tr></tbody>
        </table>
        <app-pagination
          *ngIf="!loading"
          [totalItems]="items.length"
          [page]="currentPage"
          [pageSize]="pageSize"
          label="prodotti"
          (pageChange)="goToPage($event)"
          (pageSizeChange)="changePageSize($event)">
        </app-pagination>
        <p *ngIf="!loading && !items.length">Nessuna registrazione trovata.</p>
      </section>
    </section>
  `,
  styles: [`.page-header,.form-actions,.filter-row{display:flex;align-items:end;gap:12px;justify-content:space-between;flex-wrap:wrap}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.form-grid label,.filter-row label{display:grid;gap:6px}.card{margin-bottom:20px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px #00000012}.form-control{padding:9px;border:1px solid #cbd5e1;border-radius:6px}.data-table{width:100%;border-collapse:collapse;margin:16px 0}.data-table td,.data-table th{text-align:left;padding:9px;border-bottom:1px solid #e2e8f0}.data-table small{display:block;margin-top:4px;color:#64748b;font-size:11px}.error-block{margin:12px 0;padding:10px;background:#fee2e2;color:#991b1b}.warning-block{margin:12px 0;padding:10px;background:#fff7ed;color:#9a3412;border-radius:6px}.btn{padding:8px 12px;border:0;border-radius:6px;cursor:pointer}.btn-primary{background:#2563eb;color:white}.btn-secondary{background:#e2e8f0}.btn-secondary:disabled{opacity:.5;cursor:not-allowed}.btn-danger{background:#dc2626;color:white}.loading{padding:20px;text-align:center}`]
})
export class StoriaProdottiPageComponent implements OnInit {
  items: StoriaProdottoResponse[] = [];
  loading = false;
  saving = false;
  editing = false;
  isNew = false;
  error = '';
  customersError = '';
  customers: ClienteResponse[] = [];
  id: number | null = null;
  codeFilter = '';
  clienteFilter?: number;
  articoloFilter?: number;
  pageSize = 10;
  currentPage = 1;
  form: StoriaProdottoRequest = this.emptyForm();

  constructor(
    private service: StoriaProdottiService,
    private customersService: ClientiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCustomers();
    const param = this.route.snapshot.paramMap.get('id');
    if (this.route.snapshot.routeConfig?.path === 'new') { this.isNew = true; this.editing = true; return; }
    if (param) {
      this.id = Number(param); this.editing = true; this.loading = true;
      try { this.form = this.fromResponse(await this.service.getById({ id: this.id })); }
      catch (error) { this.error = this.message(error, 'Errore nel caricamento della registrazione'); }
      finally { this.loading = false; }
      return;
    }
    await this.load();
  }

  async loadCustomers(): Promise<void> {
    this.customersError = '';
    try {
      this.customers = await this.customersService.getAll5();
    } catch (error) {
      this.customersError = this.message(error, 'Impossibile caricare i nomi e i codici dei clienti.');
    }
  }

  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.items = await this.service.getAll();
      this.currentPage = 1;
    }
    catch (error) { this.error = this.message(error, 'Errore nel caricamento dei prodotti'); }
    finally { this.loading = false; }
  }

  async filter(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      if (this.codeFilter.trim()) this.items = await this.service.getByCodiceArticolo({ codiceArticolo: this.codeFilter.trim() });
      else if (this.clienteFilter !== undefined) this.items = await this.service.getByCliente({ clienteId: this.clienteFilter });
      else if (this.articoloFilter !== undefined) this.items = await this.service.getByArticolo({ articoloId: this.articoloFilter });
      else this.items = await this.service.getAll();
      this.currentPage = 1;
    } catch (error) { this.error = this.message(error, 'Errore nella ricerca dei prodotti'); }
    finally { this.loading = false; }
  }

  get paginatedItems(): StoriaProdottoResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.items.length / this.pageSize));
    this.currentPage = Math.min(Math.max(1, page), totalPages);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  create(): void { this.router.navigate(['/prodotti', 'new']); }
  edit(item: StoriaProdottoResponse): void { if (item.id !== undefined) this.router.navigate(['/prodotti', item.id]); }
  back(): void { this.router.navigate(['/prodotti']); }

  customerName(clienteId?: number): string {
    if (clienteId === undefined) return 'Cliente non indicato';
    const customer = this.customers.find(item => item.id === clienteId);
    if (!customer) return `Cliente non disponibile (ID ${clienteId})`;
    return customer.ragioneSociale || [customer.nome, customer.cognome].filter(Boolean).join(' ') || `Cliente ${clienteId}`;
  }

  customerCode(clienteId?: number): string {
    return this.customers.find(item => item.id === clienteId)?.codice ?? '';
  }

  hasCustomer(clienteId: number): boolean {
    return this.customers.some(item => item.id === clienteId);
  }

  customerLabel(customer: ClienteResponse): string {
    const name = customer.ragioneSociale || [customer.nome, customer.cognome].filter(Boolean).join(' ') || `Cliente ${customer.id}`;
    return `${name}${customer.codice ? ` — ${customer.codice}` : ''}`;
  }

  async save(): Promise<void> {
    this.saving = true; this.error = '';
    try {
      if (this.isNew) await this.service.create({ body: this.form });
      else if (this.id !== null) await this.service.update({ id: this.id, body: this.form });
      this.back();
    } catch (error) { this.error = this.message(error, 'Errore nel salvataggio'); }
    finally { this.saving = false; }
  }

  async remove(): Promise<void> {
    if (this.id === null || !confirm('Eliminare questa registrazione?')) return;
    try { await this.service.delete({ id: this.id }); this.back(); }
    catch (error) { this.error = this.message(error, 'Errore nell’eliminazione'); }
  }

  private emptyForm(): StoriaProdottoRequest { return { codiceArticolo: '', quantita: 0 }; }
  private fromResponse(item: StoriaProdottoResponse): StoriaProdottoRequest {
    return {
      codiceArticolo: item.codiceArticolo ?? '', quantita: item.quantita ?? 0,
      articoloId: item.articoloId, clienteId: item.clienteId, categoriaId: item.categoriaId,
      categoriaDescrizione: item.categoriaDescrizione, descrizione: item.descrizione, dataDoc: item.dataDoc
    };
  }
  private message(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
}
