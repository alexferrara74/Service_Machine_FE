import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttrezzatureService } from '../../api/services/attrezzature.service';
import { AttrezzaturaResponse } from '../../api/models/attrezzatura-response';
import { PaginationComponent } from '../../shared/pagination.component';

@Component({
  selector: 'app-attrezzature-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './attrezzature-list.component.html',
  styleUrl: './attrezzature-list.component.css'
})
export class AttrezzatureListComponent implements OnInit {
  items: AttrezzaturaResponse[] = [];
  filtered: AttrezzaturaResponse[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  apiFilter: 'stato' | 'marca' | 'matricola' = 'stato';
  apiFilterValue = '';
  pageSize = 10;
  currentPage = 1;

  constructor(private service: AttrezzatureService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.items = await this.service.getAll6();
      this.applyFilter();
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel caricamento dei dati';
    } finally {
      this.loading = false;
    }
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    this.currentPage = 1;
    this.filtered = this.items.filter(i =>
      !term ||
      (i.marca ?? '').toLowerCase().includes(term) ||
      (i.matricola ?? '').toLowerCase().includes(term) ||
      (i.stato ?? '').toLowerCase().includes(term) ||
      (i.descrizione ?? '').toLowerCase().includes(term)
    );
  }

  get paginatedItems(): AttrezzaturaResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.currentPage = Math.min(Math.max(1, page), totalPages);
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  async filterFromApi(): Promise<void> {
    const value = this.apiFilterValue.trim();
    if (!value) {
      await this.load();
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      if (this.apiFilter === 'stato') {
        this.items = await this.service.getByStato({ stato: value });
      } else if (this.apiFilter === 'marca') {
        this.items = await this.service.getByMarca({ marca: value });
      } else {
        this.items = [await this.service.getByMatricola1({ matricola: value })];
      }
      this.applyFilter();
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nella ricerca delle attrezzature';
    } finally {
      this.loading = false;
    }
  }

  create(): void {
    this.router.navigate(['/attrezzature/new']);
  }

  edit(item: AttrezzaturaResponse): void {
    this.router.navigate(['/attrezzature', item.id]);
  }

  async deleteItem(item: AttrezzaturaResponse): Promise<void> {
    if (!confirm(`Eliminare l'attrezzatura "${item.descrizione ?? item.matricola}"?`)) return;
    try {
      await this.service.delete6({ id: item.id! });
      await this.load();
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nell\'eliminazione';
    }
  }
}
