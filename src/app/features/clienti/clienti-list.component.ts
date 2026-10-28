import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientiService } from '../../api/services/clienti.service';
import { ClienteResponse } from '../../api/models/cliente-response';
import { PaginationComponent } from '../../shared/pagination.component';

@Component({
  selector: 'app-clienti-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './clienti-list.component.html',
  styleUrl: './clienti-list.component.css'
})
export class ClientiListComponent implements OnInit {
  items: ClienteResponse[] = [];
  filtered: ClienteResponse[] = [];
  loading = false;
  error = '';
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

  constructor(private service: ClientiService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.items = await this.service.getAll5();
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
      (i.ragioneSociale ?? '').toLowerCase().includes(term) ||
      (i.nome ?? '').toLowerCase().includes(term) ||
      (i.cognome ?? '').toLowerCase().includes(term) ||
      (i.codice ?? '').toLowerCase().includes(term) ||
      (i.email ?? '').toLowerCase().includes(term)
    );
  }

  get paginatedItems(): ClienteResponse[] {
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

  create(): void {
    this.router.navigate(['/clienti/new']);
  }

  edit(item: ClienteResponse): void {
    this.router.navigate(['/clienti', item.id]);
  }

  async deleteItem(item: ClienteResponse): Promise<void> {
    if (!confirm(`Eliminare il cliente "${item.ragioneSociale ?? item.nome}"?`)) return;
    try {
      await this.service.delete5({ id: item.id! });
      await this.load();
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nell\'eliminazione';
    }
  }
}
