import { AuthService } from '../../core/auth.service';
import { AdminOnlyDirective } from '../../core/admin-only.directive';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MagazzinoService } from '../../api/services/magazzino.service';
import { MagazzinoRequest } from '../../api/models/magazzino-request';
import { MagazzinoResponse } from '../../api/models/magazzino-response';
import { PaginationComponent } from '../../shared/pagination.component';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-magazzino-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, AdminOnlyDirective],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Ubicazioni magazzino</h1>
        <button appAdmin type="button" class="btn btn-primary" (click)="create()">+ Nuova ubicazione</button>
      </header>
      <div *ngIf="error" class="error-block">{{ error }}</div>
      <section *ngIf="editing" class="card">
        <h2>{{ isNew ? 'Nuova ubicazione' : 'Modifica ubicazione' }}</h2>
        <form (ngSubmit)="save()"><fieldset class="lock form-grid" [disabled]="!auth.isAdmin()">
          <label>Codice ubicazione<input class="form-control" [(ngModel)]="form.codiceUbicazione" name="codice" required></label>
          <label>Zona<input class="form-control" [(ngModel)]="form.zona" name="zona" required></label>
          <label>Scaffale<input class="form-control" [(ngModel)]="form.scaffale" name="scaffale"></label>
          <label>Ripiano<input class="form-control" [(ngModel)]="form.ripiano" name="ripiano"></label>
          <label>Capacità massima<input class="form-control" type="number" [(ngModel)]="form.capacitaMax" name="capacita"></label>
          <label>Note<textarea class="form-control" [(ngModel)]="form.note" name="note"></textarea></label>
          </fieldset><div class="form-actions">
            <button appAdmin class="btn btn-primary" [disabled]="saving">{{ saving ? 'Salvataggio...' : 'Salva' }}</button>
            <button type="button" class="btn btn-secondary" (click)="back()">Indietro</button>
            <button appAdmin *ngIf="!isNew" type="button" class="btn btn-danger" (click)="remove()">Elimina</button>
          </div>
        </form>
      </section>
      <section *ngIf="!editing" class="card">
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <div *ngIf="!loading && items.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Codice</th><th>Zona</th><th>Scaffale</th><th>Ripiano</th><th>Capacità</th><th>Note</th><th></th></tr></thead>
            <tbody><tr *ngFor="let item of paginatedItems">
              <td>{{ item.ubicazioneId }}</td><td>{{ item.codiceUbicazione }}</td><td>{{ item.zona }}</td><td>{{ item.scaffale }}</td><td>{{ item.ripiano }}</td><td>{{ item.capacitaMax }}</td><td>{{ item.note }}</td>
              <td><button type="button" class="btn btn-secondary" (click)="edit(item)">{{ auth.isAdmin() ? 'Modifica' : 'Apri' }}</button></td>
            </tr></tbody>
          </table>
        </div>
        <app-pagination
          *ngIf="!loading"
          [totalItems]="items.length"
          [page]="currentPage"
          [pageSize]="pageSize"
          label="ubicazioni"
          (pageChange)="goToPage($event)"
          (pageSizeChange)="changePageSize($event)">
        </app-pagination>
        <p *ngIf="!loading && !items.length">Nessuna ubicazione trovata.</p>
      </section>
    </section>
  `,
  styles: [`
    .page-header,.form-actions{display:flex;align-items:center;gap:12px}
    .page-header{justify-content:space-between;margin-bottom:20px}
    .page-header h1{margin:0}
    .form-actions{grid-column:1/-1;justify-content:flex-end;flex-wrap:wrap}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
    .form-grid label{display:grid;gap:6px}
    .card{margin-bottom:20px;padding:20px;background:var(--surface);border-radius:12px;box-shadow:0 2px 8px #00000012}
    .form-control{min-width:0;padding:9px;border:1px solid var(--field);border-radius:6px}
    .table-wrap{overflow-x:auto}
    .data-table{width:100%;border-collapse:collapse;margin:16px 0}
    .data-table td,.data-table th{text-align:left;padding:9px;border-bottom:1px solid var(--line)}
    .data-table th:last-child,.data-table td:last-child{text-align:right}
    .error-block{margin:12px 0;padding:10px;background:var(--danger-bg);color:var(--danger)}
    .btn{padding:9px 14px;border:0;border-radius:6px;cursor:pointer;white-space:nowrap}
    .btn-primary{background:var(--petrol);color:white}
    .btn-secondary{background:var(--line)}
    .btn-danger{background:var(--danger);color:white}
    .loading{padding:20px;text-align:center}
    @media(max-width:600px){.page-header{align-items:stretch;flex-direction:column}.page-header .btn{width:100%}.card{padding:14px}}
  `]
})
export class MagazzinoPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  items: MagazzinoResponse[] = [];
  loading = false;
  saving = false;
  editing = false;
  isNew = false;
  error = '';
  id: number | null = null;
  pageSize = 10;
  currentPage = 1;
  form: MagazzinoRequest = this.emptyForm();

  constructor(private service: MagazzinoService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const param = this.route.snapshot.paramMap.get('id');
    if (this.route.snapshot.routeConfig?.path === 'new') { this.isNew = true; this.editing = true; return; }
    if (param) {
      this.id = Number(param); this.editing = true; this.loading = true;
      try { this.form = this.fromResponse(await this.service.getById2({ id: this.id })); }
      catch (error) { this.error = errorMessage(error, 'Errore nel caricamento dell’ubicazione'); }
      finally { this.loading = false; }
      return;
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try { this.items = await this.service.getAll2(); this.currentPage = 1; }
    catch (error) { this.error = errorMessage(error, 'Errore nel caricamento delle ubicazioni'); }
    finally { this.loading = false; }
  }

  get paginatedItems(): MagazzinoResponse[] {
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

  create(): void { this.router.navigate(['/magazzino', 'new']); }
  edit(item: MagazzinoResponse): void { if (item.ubicazioneId !== undefined) this.router.navigate(['/magazzino', item.ubicazioneId]); }
  back(): void { this.router.navigate(['/magazzino']); }

  async save(): Promise<void> {
    this.saving = true; this.error = '';
    try {
      if (this.isNew) await this.service.create2({ body: this.form });
      else if (this.id !== null) await this.service.update2({ id: this.id, body: this.form });
      this.back();
    } catch (error) { this.error = errorMessage(error, 'Errore nel salvataggio'); }
    finally { this.saving = false; }
  }

  async remove(): Promise<void> {
    if (this.id === null || !confirm('Eliminare questa ubicazione?')) return;
    try { await this.service.delete2({ id: this.id }); this.back(); }
    catch (error) { this.error = errorMessage(error, 'Errore nell’eliminazione'); }
  }

  private emptyForm(): MagazzinoRequest { return { codiceUbicazione: '', zona: '' }; }
  private fromResponse(item: MagazzinoResponse): MagazzinoRequest {
    return { codiceUbicazione: item.codiceUbicazione ?? '', zona: item.zona ?? '', scaffale: item.scaffale, ripiano: item.ripiano, capacitaMax: item.capacitaMax, note: item.note };
  }
}
