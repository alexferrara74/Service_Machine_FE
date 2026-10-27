import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MagazzinoPosizioniService } from '../../api/services/magazzino-posizioni.service';
import { PosizioneArticoloRequest } from '../../api/models/posizione-articolo-request';
import { PosizioneArticoloResponse } from '../../api/models/posizione-articolo-response';
import { PaginationComponent } from '../../shared/pagination.component';

@Component({
  selector: 'app-magazzino-posizioni-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Posizioni articoli</h1>
        <button type="button" class="btn btn-primary" (click)="create()">+ Nuova posizione</button>
      </header>
      <div *ngIf="error" class="error-block">{{ error }}</div>
      <section *ngIf="editing" class="card">
        <h2>{{ isNew ? 'Nuova posizione' : 'Modifica posizione' }}</h2>
        <form (ngSubmit)="save()" class="form-grid">
          <label>Articolo ID<input class="form-control" type="number" [(ngModel)]="form.articoloId" name="articolo" required></label>
          <label>Ubicazione ID<input class="form-control" type="number" [(ngModel)]="form.ubicazioneId" name="ubicazione" required></label>
          <label>Quantità presente<input class="form-control" type="number" [(ngModel)]="form.quantitaPresente" name="quantita" required></label>
          <div class="form-actions">
            <button class="btn btn-primary" [disabled]="saving">{{ saving ? 'Salvataggio...' : 'Salva' }}</button>
            <button type="button" class="btn btn-secondary" (click)="back()">Indietro</button>
            <button *ngIf="!isNew" type="button" class="btn btn-danger" (click)="remove()">Elimina</button>
          </div>
        </form>
      </section>
      <section *ngIf="!editing" class="card">
        <div class="inventory-tools">
          <form class="filter-row search-filters" (ngSubmit)="filter()">
            <label>Ubicazione ID<input class="form-control" type="number" [(ngModel)]="ubicazioneFilter" name="ubicazioneFilter"></label>
            <label>Articolo ID<input class="form-control" type="number" [(ngModel)]="articoloFilter" name="articoloFilter"></label>
            <div class="filter-actions">
              <button type="submit" class="btn btn-primary">Cerca posizioni</button>
              <button type="button" class="btn btn-secondary" (click)="clearFilters()">Azzera filtri</button>
            </div>
          </form>
          <form class="filter-row stock-check" (ngSubmit)="checkStock()">
            <label>Giacenza totale per articolo<input class="form-control" type="number" [(ngModel)]="stockArticleId" name="stockArticleId" required></label>
            <button type="submit" class="btn btn-secondary">Calcola giacenza</button>
            <strong *ngIf="stock !== null" class="stock-result">Totale: {{ stock }}</strong>
          </form>
        </div>
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <div *ngIf="!loading && items.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Articolo</th><th>Ubicazione</th><th>Codice ubicazione</th><th>Quantità</th><th></th></tr></thead>
            <tbody><tr *ngFor="let item of paginatedItems">
              <td>{{ item.id }}</td><td>{{ item.articoloId }}</td><td>{{ item.ubicazioneId }}</td><td>{{ item.codiceUbicazione }}</td><td>{{ item.quantitaPresente }}</td>
              <td><button type="button" class="btn btn-secondary" (click)="edit(item)">Modifica</button></td>
            </tr></tbody>
          </table>
        </div>
        <app-pagination
          *ngIf="!loading"
          [totalItems]="items.length"
          [page]="currentPage"
          [pageSize]="pageSize"
          label="posizioni"
          (pageChange)="goToPage($event)"
          (pageSizeChange)="changePageSize($event)">
        </app-pagination>
        <p *ngIf="!loading && !items.length">Nessuna posizione trovata.</p>
      </section>
    </section>
  `,
  styles: [`
    .page-header,.form-actions,.filter-row{display:flex;gap:12px}
    .page-header{align-items:center;justify-content:space-between;margin-bottom:20px}
    .page-header h1{margin:0}
    .form-actions{grid-column:1/-1;justify-content:flex-end;flex-wrap:wrap}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
    .form-grid label,.filter-row label{display:grid;gap:6px}
    .inventory-tools{display:grid;gap:14px;margin-bottom:20px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}
    .filter-row{align-items:end;flex-wrap:wrap}
    .search-filters label{flex:1 1 180px}
    .stock-check{padding-top:14px;border-top:1px solid #e2e8f0}
    .stock-check label{flex:0 1 260px}
    .filter-actions{display:flex;gap:8px;flex-wrap:wrap}
    .stock-result{align-self:center;color:#1e293b}
    .card{margin-bottom:20px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px #00000012}
    .form-control{width:100%;min-width:0;padding:9px;border:1px solid #cbd5e1;border-radius:6px}
    .table-wrap{overflow-x:auto}
    .data-table{width:100%;border-collapse:collapse;margin:16px 0}
    .data-table td,.data-table th{text-align:left;padding:9px;border-bottom:1px solid #e2e8f0}
    .data-table th:last-child,.data-table td:last-child{text-align:right}
    .error-block{margin:12px 0;padding:10px;background:#fee2e2;color:#991b1b}
    .btn{padding:9px 14px;border:0;border-radius:6px;cursor:pointer;white-space:nowrap}
    .btn-primary{background:#2563eb;color:white}
    .btn-secondary{background:#e2e8f0}
    .btn-danger{background:#dc2626;color:white}
    .loading{padding:20px;text-align:center}
    @media(max-width:600px){.page-header{align-items:stretch;flex-direction:column}.page-header .btn,.filter-actions .btn{width:100%}.filter-actions{width:100%}.filter-actions .btn{flex:1}.stock-check label{flex-basis:100%}.card{padding:14px}}
  `]
})
export class MagazzinoPosizioniPageComponent implements OnInit {
  items: PosizioneArticoloResponse[] = [];
  loading = false;
  saving = false;
  editing = false;
  isNew = false;
  error = '';
  id: number | null = null;
  ubicazioneFilter?: number;
  articoloFilter?: number;
  stockArticleId?: number;
  stock: number | null = null;
  pageSize = 10;
  currentPage = 1;
  form: PosizioneArticoloRequest = { articoloId: 0, ubicazioneId: 0, quantitaPresente: 0 };

  constructor(private service: MagazzinoPosizioniService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const param = this.route.snapshot.paramMap.get('id');
    if (this.route.snapshot.routeConfig?.path === 'new') { this.isNew = true; this.editing = true; return; }
    if (param) {
      this.id = Number(param); this.editing = true; this.loading = true;
      try {
        const item = await this.service.getById3({ id: this.id });
        this.form = { articoloId: item.articoloId ?? 0, ubicazioneId: item.ubicazioneId ?? 0, quantitaPresente: item.quantitaPresente ?? 0 };
      } catch (error) { this.error = this.message(error, 'Errore nel caricamento della posizione'); }
      finally { this.loading = false; }
      return;
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try { this.items = await this.service.getAll3(); this.currentPage = 1; }
    catch (error) { this.error = this.message(error, 'Errore nel caricamento delle posizioni'); }
    finally { this.loading = false; }
  }

  async filter(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      if (this.ubicazioneFilter !== undefined) this.items = await this.service.getByUbicazione({ ubicazioneId: this.ubicazioneFilter });
      else if (this.articoloFilter !== undefined) this.items = await this.service.getByArticolo2({ articoloId: this.articoloFilter });
      else this.items = await this.service.getAll3();
      this.currentPage = 1;
    } catch (error) { this.error = this.message(error, 'Errore nella ricerca'); }
    finally { this.loading = false; }
  }

  async clearFilters(): Promise<void> {
    this.ubicazioneFilter = undefined;
    this.articoloFilter = undefined;
    await this.load();
  }

  get paginatedItems(): PosizioneArticoloResponse[] {
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

  async checkStock(): Promise<void> {
    if (this.stockArticleId === undefined) return;
    this.error = '';
    try { this.stock = await this.service.getGiacenzaTotale({ articoloId: this.stockArticleId }); }
    catch (error) { this.error = this.message(error, 'Errore nel calcolo della giacenza'); }
  }

  create(): void { this.router.navigate(['/magazzino-posizioni', 'new']); }
  edit(item: PosizioneArticoloResponse): void { if (item.id !== undefined) this.router.navigate(['/magazzino-posizioni', item.id]); }
  back(): void { this.router.navigate(['/magazzino-posizioni']); }

  async save(): Promise<void> {
    this.saving = true; this.error = '';
    try {
      if (this.isNew) await this.service.create3({ body: this.form });
      else if (this.id !== null) await this.service.update3({ id: this.id, body: this.form });
      this.back();
    } catch (error) { this.error = this.message(error, 'Errore nel salvataggio'); }
    finally { this.saving = false; }
  }

  async remove(): Promise<void> {
    if (this.id === null || !confirm('Eliminare questa posizione?')) return;
    try { await this.service.delete3({ id: this.id }); this.back(); }
    catch (error) { this.error = this.message(error, 'Errore nell’eliminazione'); }
  }

  private message(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
}
