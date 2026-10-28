import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/pagination.component';
import { CatalogoProdottiService } from './catalogo-prodotti.service';
import { ProdottoCatalogo } from './prodotto-catalogo';

@Component({
  selector: 'app-catalogo-prodotti-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>Catalogo ERP</h1>
          <p>Prodotti e attrezzature sincronizzati dall’ERP.</p>
        </div>
        <button class="btn btn-secondary" type="button" [disabled]="loading" (click)="load()">
          Aggiorna
        </button>
      </header>
      <div *ngIf="error" class="error-block">{{ error }}</div>
      <section class="card">
        <div class="filter-row">
          <label>
            Cerca
            <input class="form-control" [(ngModel)]="search" (ngModelChange)="currentPage = 1" placeholder="Codice, descrizione o classe">
          </label>
          <label>
            Tipo
            <select class="form-control" [(ngModel)]="equipmentFilter" (ngModelChange)="currentPage = 1">
              <option value="all">Tutti</option>
              <option value="products">Solo prodotti</option>
              <option value="equipment">Solo attrezzature</option>
              <option value="accessories">Solo accessori</option>
            </select>
          </label>
          <label>
            Categoria
            <select class="form-control" [(ngModel)]="categoryFilter" (ngModelChange)="currentPage = 1">
              <option [ngValue]="null">Tutte</option>
              <option *ngFor="let category of categories" [ngValue]="category.id">
                {{ category.description || category.id }}
              </option>
            </select>
          </label>
        </div>
        <div *ngIf="loading" class="loading">Caricamento catalogo...</div>
        <table *ngIf="!loading && filteredItems.length" class="data-table">
          <thead>
            <tr>
              <th>Codice</th>
              <th>Descrizione</th>
              <th>Categoria</th>
              <th>Classe / sottoclasse</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of paginatedItems">
              <td>{{ product.codice }}</td>
              <td>{{ product.descrizione }}</td>
              <td>{{ product.categoriaDescrizione || product.categoriaId || '—' }}</td>
              <td>{{ product.classeCodice || '—' }}<span *ngIf="product.sottoclasseCodice"> / {{ product.sottoclasseCodice }}</span></td>
              <td>{{ typeLabel(product) }}</td>
            </tr>
          </tbody>
        </table>
        <app-pagination
          *ngIf="!loading"
          [totalItems]="filteredItems.length"
          [page]="currentPage"
          [pageSize]="pageSize"
          label="articoli"
          (pageChange)="goToPage($event)"
          (pageSizeChange)="changePageSize($event)">
        </app-pagination>
        <p *ngIf="!loading && !filteredItems.length">Nessun articolo trovato.</p>
      </section>
    </section>
  `,
  styles: [`
    .page-header,.filter-row{display:flex;align-items:end;gap:12px;justify-content:space-between;flex-wrap:wrap}
    .page-header{margin-bottom:20px}
    .page-header h1{margin:0;color:#1e2a3a;font-size:22px}
    .page-header p{margin:6px 0 0;color:#64748b}
    .filter-row label{display:grid;gap:6px;min-width:190px}
    .card{padding:20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px #00000012}
    .form-control{padding:9px;border:1px solid #cbd5e1;border-radius:6px}
    .data-table{width:100%;border-collapse:collapse;margin:16px 0}
    .data-table td,.data-table th{text-align:left;padding:9px;border-bottom:1px solid #e2e8f0}
    .error-block{margin:12px 0;padding:10px;background:#fee2e2;color:#991b1b}
    .loading{padding:20px;text-align:center}
  `]
})
export class CatalogoProdottiPageComponent implements OnInit {
  items: ProdottoCatalogo[] = [];
  loading = false;
  error = '';
  search = '';
  equipmentFilter: 'all' | 'products' | 'equipment' | 'accessories' = 'products';
  categoryFilter: number | null = null;
  currentPage = 1;
  pageSize = 25;

  constructor(private service: CatalogoProdottiService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.items = await this.service.getAll();
      this.currentPage = 1;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Impossibile caricare il catalogo ERP.';
    } finally {
      this.loading = false;
    }
  }

  get categories(): Array<{ id: number; description?: string }> {
    const categories = new Map<number, string | undefined>();
    for (const product of this.items) {
      if (product.categoriaId !== undefined) {
        categories.set(product.categoriaId, product.categoriaDescrizione);
      }
    }
    return [...categories.entries()]
      .map(([id, description]) => ({ id, description }))
      .sort((a, b) => (a.description || String(a.id)).localeCompare(b.description || String(b.id)));
  }

  get filteredItems(): ProdottoCatalogo[] {
    const search = this.search.trim().toLocaleLowerCase();
    return this.items.filter(product => {
      const matchesSearch = !search || [
        product.codice,
        product.descrizione,
        product.categoriaDescrizione,
        product.classeCodice,
        product.sottoclasseCodice
      ].some(value => value?.toLocaleLowerCase().includes(search));
      const matchesType = this.equipmentFilter === 'all' ||
        this.typeKey(product) === this.equipmentFilter;
      const matchesCategory = this.categoryFilter === null || product.categoriaId === this.categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
  }

  typeKey(product: ProdottoCatalogo): 'products' | 'equipment' | 'accessories' {
    if (product.isAttrezzatura) return 'equipment';
    return product.isAccessorio ? 'accessories' : 'products';
  }

  typeLabel(product: ProdottoCatalogo): string {
    const labels = { products: 'Prodotto', equipment: 'Attrezzatura', accessories: 'Accessorio' };
    return labels[this.typeKey(product)];
  }

  get paginatedItems(): ProdottoCatalogo[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
    this.currentPage = Math.min(Math.max(1, page), totalPages);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }
}
