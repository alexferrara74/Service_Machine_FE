import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InterventiService } from '../../api/services/interventi.service';
import { InterventoRequest } from '../../api/models/intervento-request';
import { InterventoResponse } from '../../api/models/intervento-response';
import { RicambioRequest } from '../../api/models/ricambio-request';
import { RicambioResponse } from '../../api/models/ricambio-response';
import { PaginationComponent } from '../../shared/pagination.component';

@Component({
  selector: 'app-interventi-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Interventi</h1>
        <button class="btn btn-primary" (click)="create()">+ Nuovo intervento</button>
      </header>
      <div *ngIf="error" class="error-block">⚠️ {{ error }}</div>

      <section *ngIf="editing" class="card">
        <h2>{{ isNew ? 'Nuovo intervento' : 'Intervento' }}</h2>
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <form *ngIf="!loading" (ngSubmit)="save()">
          <div class="form-grid">
            <label>Cliente ID<input class="form-control" type="number" [(ngModel)]="form.clienteId" name="clienteId" required></label>
            <label>Titolo<input class="form-control" [(ngModel)]="form.titolo" name="titolo" required></label>
            <label>Data apertura<input class="form-control" type="date" [(ngModel)]="form.dataApertura" name="dataApertura" required></label>
            <label>Data chiusura<input class="form-control" type="date" [(ngModel)]="form.dataChiusura" name="dataChiusura"></label>
            <label>Matricola attrezzatura<input class="form-control" [(ngModel)]="form.matricolaAttrezzatura" name="matricola"></label>
            <label>Stato<input class="form-control" [(ngModel)]="form.stato" name="stato" required></label>
            <label>Costo manodopera<input class="form-control" type="number" step="0.01" [(ngModel)]="form.costoManodopera" name="costo"></label>
            <label>Problema<textarea class="form-control" [(ngModel)]="form.descrizioneProblema" name="problema"></textarea></label>
            <label>Soluzione<textarea class="form-control" [(ngModel)]="form.soluzioneApplicata" name="soluzione"></textarea></label>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" [disabled]="saving">{{ saving ? 'Salvataggio...' : 'Salva' }}</button>
            <button type="button" class="btn btn-secondary" (click)="back()">Indietro</button>
            <button *ngIf="!isNew" type="button" class="btn btn-danger" (click)="deleteIntervento()">Elimina</button>
          </div>
        </form>
        <section *ngIf="!isNew && id !== null" class="card nested">
          <h3>Ricambi utilizzati</h3>
          <button class="btn btn-secondary" (click)="loadRicambi()">Aggiorna ricambi</button>
          <div *ngIf="ricambiError" class="error-block">{{ ricambiError }}</div>
          <table class="data-table" *ngIf="ricambi.length">
            <thead><tr><th>Articolo</th><th>Codice</th><th>Descrizione</th><th>Quantità</th><th>Prezzo unitario</th><th></th></tr></thead>
            <tbody><tr *ngFor="let item of paginatedRicambi">
              <td>{{ item.articoloId }}</td><td>{{ item.codiceRicambio }}</td><td>{{ item.descrizioneRicambio }}</td>
              <td>{{ item.quantitaUtilizzata }}</td><td>{{ item.prezzoUnitario }}</td>
              <td><button class="btn btn-danger" (click)="removeRicambio(item)">Rimuovi</button></td>
            </tr></tbody>
          </table>
          <app-pagination
            [totalItems]="ricambi.length"
            [page]="ricambiPage"
            [pageSize]="ricambiPageSize"
            label="ricambi"
            (pageChange)="goToRicambiPage($event)"
            (pageSizeChange)="changeRicambiPageSize($event)">
          </app-pagination>
          <form (ngSubmit)="addRicambio()" class="form-grid">
            <label>Articolo ID<input class="form-control" type="number" [(ngModel)]="ricambioForm.articoloId" name="articoloId" required></label>
            <label>Quantità<input class="form-control" type="number" [(ngModel)]="ricambioForm.quantitaUtilizzata" name="quantitaUtilizzata" required></label>
            <label>Codice<input class="form-control" [(ngModel)]="ricambioForm.codiceRicambio" name="codiceRicambio"></label>
            <label>Descrizione<input class="form-control" [(ngModel)]="ricambioForm.descrizioneRicambio" name="descrizioneRicambio"></label>
            <label>Prezzo unitario<input class="form-control" type="number" step="0.01" [(ngModel)]="ricambioForm.prezzoUnitario" name="prezzoUnitario"></label>
            <button class="btn btn-primary">Aggiungi ricambio</button>
          </form>
        </section>
      </section>

      <section *ngIf="!editing" class="card">
        <form (ngSubmit)="filterByCliente()" class="filter-row">
          <label>Filtra per cliente ID<input class="form-control" type="number" [(ngModel)]="clienteFilter" name="clienteFilter"></label>
          <button class="btn btn-secondary">Filtra</button>
          <button type="button" class="btn btn-secondary" (click)="load()">Tutti</button>
        </form>
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <table *ngIf="!loading && items.length" class="data-table">
          <thead><tr><th>ID</th><th>Titolo</th><th>Cliente</th><th>Attrezzatura</th><th>Stato</th><th>Data</th><th></th></tr></thead>
          <tbody><tr *ngFor="let item of paginatedItems">
            <td>{{ item.interventoId }}</td><td>{{ item.titolo }}</td><td>{{ item.ragioneSocialeCliente ?? item.clienteId }}</td>
            <td>{{ item.matricolaAttrezzatura }}</td><td>{{ item.stato }}</td><td>{{ item.dataApertura }}</td>
            <td><button class="btn btn-secondary" (click)="edit(item)">Apri</button></td>
          </tr></tbody>
        </table>
        <app-pagination
          *ngIf="!loading"
          [totalItems]="items.length"
          [page]="currentPage"
          [pageSize]="pageSize"
          label="interventi"
          (pageChange)="goToPage($event)"
          (pageSizeChange)="changePageSize($event)">
        </app-pagination>
        <p *ngIf="!loading && !items.length">Nessun intervento trovato.</p>
      </section>
    </section>
  `,
  styles: [`.page-header,.form-actions,.filter-row{display:flex;align-items:center;gap:12px;justify-content:space-between}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.form-grid label,.filter-row label{display:grid;gap:6px}.nested{margin-top:20px}.card{margin-bottom:20px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px #00000012}.form-control{padding:9px;border:1px solid #cbd5e1;border-radius:6px}.data-table{width:100%;border-collapse:collapse;margin:16px 0}.data-table td,.data-table th{text-align:left;padding:9px;border-bottom:1px solid #e2e8f0}.error-block{margin:12px 0;padding:10px;background:#fee2e2;color:#991b1b}.btn{padding:8px 12px;border:0;border-radius:6px;cursor:pointer}.btn-primary{background:#2563eb;color:white}.btn-secondary{background:#e2e8f0}.btn-danger{background:#dc2626;color:white}.loading{padding:20px;text-align:center}`]
})
export class InterventiPageComponent implements OnInit {
  items: InterventoResponse[] = [];
  ricambi: RicambioResponse[] = [];
  loading = false;
  saving = false;
  editing = false;
  isNew = false;
  error = '';
  ricambiError = '';
  id: number | null = null;
  clienteFilter?: number;
  pageSize = 10;
  currentPage = 1;
  ricambiPageSize = 10;
  ricambiPage = 1;
  form: InterventoRequest = this.emptyForm();
  ricambioForm: RicambioRequest = { articoloId: 0, interventoId: 0, quantitaUtilizzata: 1 };

  constructor(private service: InterventiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (this.route.snapshot.routeConfig?.path === 'new') {
      this.isNew = true;
      this.editing = true;
      return;
    }
    if (idParam) {
      this.id = Number(idParam);
      this.editing = true;
      this.loading = true;
      try {
        const data = await this.service.getById4({ id: this.id });
        this.form = this.fromResponse(data);
        this.ricambioForm.interventoId = this.id;
        await this.loadRicambi();
      } catch (error) {
        this.error = this.message(error, 'Errore nel caricamento dell’intervento');
      } finally {
        this.loading = false;
      }
      return;
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try { this.items = await this.service.getAll4(); this.currentPage = 1; }
    catch (error) { this.error = this.message(error, 'Errore nel caricamento degli interventi'); }
    finally { this.loading = false; }
  }

  async filterByCliente(): Promise<void> {
    if (this.clienteFilter === undefined) return this.load();
    this.loading = true;
    this.error = '';
    try { this.items = await this.service.getByCliente2({ clienteId: this.clienteFilter }); this.currentPage = 1; }
    catch (error) { this.error = this.message(error, 'Errore nel filtro per cliente'); }
    finally { this.loading = false; }
  }

  get paginatedItems(): InterventoResponse[] {
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

  get paginatedRicambi(): RicambioResponse[] {
    const start = (this.ricambiPage - 1) * this.ricambiPageSize;
    return this.ricambi.slice(start, start + this.ricambiPageSize);
  }

  goToRicambiPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.ricambi.length / this.ricambiPageSize));
    this.ricambiPage = Math.min(Math.max(1, page), totalPages);
  }

  changeRicambiPageSize(size: number): void {
    this.ricambiPageSize = size;
    this.ricambiPage = 1;
  }

  create(): void { this.router.navigate(['/interventi', 'new']); }
  edit(item: InterventoResponse): void { if (item.interventoId !== undefined) this.router.navigate(['/interventi', item.interventoId]); }
  back(): void { this.router.navigate(['/interventi']); }

  async save(): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      if (this.isNew) await this.service.create4({ body: this.form });
      else if (this.id !== null) await this.service.update4({ id: this.id, body: this.form });
      this.back();
    } catch (error) { this.error = this.message(error, 'Errore nel salvataggio'); }
    finally { this.saving = false; }
  }

  async deleteIntervento(): Promise<void> {
    if (this.id === null || !confirm('Eliminare questo intervento?')) return;
    try { await this.service.delete4({ id: this.id }); this.back(); }
    catch (error) { this.error = this.message(error, 'Errore nell’eliminazione'); }
  }

  async loadRicambi(): Promise<void> {
    if (this.id === null) return;
    this.ricambiError = '';
    try { this.ricambi = await this.service.getRicambi({ id: this.id }); this.ricambiPage = 1; }
    catch (error) { this.ricambiError = this.message(error, 'Errore nel caricamento dei ricambi'); }
  }

  async addRicambio(): Promise<void> {
    if (this.id === null) return;
    this.ricambiError = '';
    try {
      await this.service.addRicambio({ id: this.id, body: { ...this.ricambioForm, interventoId: this.id } });
      this.ricambioForm = { articoloId: 0, interventoId: this.id, quantitaUtilizzata: 1 };
      await this.loadRicambi();
    } catch (error) { this.ricambiError = this.message(error, 'Errore nell’aggiunta del ricambio'); }
  }

  async removeRicambio(item: RicambioResponse): Promise<void> {
    if (this.id === null || item.id === undefined || !confirm('Rimuovere questo ricambio?')) return;
    try { await this.service.deleteRicambio({ id: this.id, ricambioId: item.id }); await this.loadRicambi(); }
    catch (error) { this.ricambiError = this.message(error, 'Errore nella rimozione del ricambio'); }
  }

  private emptyForm(): InterventoRequest {
    return { clienteId: 0, dataApertura: new Date().toISOString().slice(0, 10), stato: '', titolo: '' };
  }

  private fromResponse(data: InterventoResponse): InterventoRequest {
    return {
      clienteId: data.clienteId ?? 0, titolo: data.titolo ?? '', dataApertura: data.dataApertura ?? '',
      dataChiusura: data.dataChiusura, matricolaAttrezzatura: data.matricolaAttrezzatura, stato: data.stato ?? '',
      costoManodopera: data.costoManodopera, descrizioneProblema: data.descrizioneProblema,
      soluzioneApplicata: data.soluzioneApplicata
    };
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
