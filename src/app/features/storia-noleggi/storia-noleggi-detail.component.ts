import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { StoriaNoleggiService } from '../../api/services/storia-noleggi.service';
import { StoriaNoleggioResponse } from '../../api/models/storia-noleggio-response';
import { StoriaNoleggioRequest } from '../../api/models/storia-noleggio-request';
import { StoriaProdottiService } from '../../api/services/storia-prodotti.service';
import { StoriaProdottoResponse } from '../../api/models/storia-prodotto-response';

@Component({
  selector: 'app-storia-noleggi-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="page">
  <div class="page-header">
    <h1>{{ isNew ? '+ Nuovo Noleggio' : '✏️ Modifica Noleggio' }}</h1>
    <div class="header-actions">
      <button class="btn btn-secondary" (click)="goBack()">← Indietro</button>
      <button *ngIf="!isNew" class="btn btn-danger" (click)="deleteItem()">🗑️ Elimina</button>
    </div>
  </div>
  <div class="card">
    <div *ngIf="loading" class="loading">⏳ Caricamento...</div>
    <div *ngIf="error" class="error-block">⚠️ {{ error }}</div>
    <form *ngIf="!loading" (ngSubmit)="save()">
      <div class="form-grid">
        <div class="form-group">
          <label>Doc ID</label>
          <input type="number" [(ngModel)]="form.docId" name="docId" class="form-control" placeholder="Doc ID" [readonly]="!isNew" />
        </div>
        <div class="form-group">
          <label>Cliente ID</label>
          <input type="number" [(ngModel)]="form.clienteId" name="clienteId" class="form-control" placeholder="Cliente ID" />
        </div>
        <div class="form-group">
          <label>Prodotto</label>
          <select *ngIf="availableArticles.length" [(ngModel)]="form.articoloId" name="articoloId" class="form-control">
            <option [ngValue]="undefined">Seleziona un articolo</option>
            <option *ngFor="let article of availableArticles" [ngValue]="article.articoloId">
              {{ articleLabel(article) }}
            </option>
          </select>
          <input *ngIf="!availableArticles.length" type="number" [(ngModel)]="form.articoloId" name="articoloId" class="form-control" placeholder="Articolo ID" />
        </div>
        <div class="form-group">
          <label>Matricola</label>
          <input type="text" [(ngModel)]="form.matricola" name="matricola" class="form-control" placeholder="Matricola" />
        </div>
        <div class="form-group">
          <label>Quantità</label>
          <input type="number" [(ngModel)]="form.quantita" name="quantita" class="form-control" placeholder="Quantità" />
        </div>
        <div class="form-group">
          <label>Data Doc</label>
          <input type="date" [(ngModel)]="form.dataDoc" name="dataDoc" class="form-control" />
        </div>
        <div class="form-group">
          <label>Sezionale</label>
          <input type="text" [(ngModel)]="form.sezionale" name="sezionale" class="form-control" placeholder="Sezionale" />
        </div>
      </div>
      <div *ngIf="selectedArticle" class="article-info">
        <strong>Articolo selezionato:</strong> {{ articleLabel(selectedArticle) }}
      </div>
      <div *ngIf="form.articoloId !== undefined && !selectedArticle" class="article-warning">
        Nessun dettaglio disponibile per il prodotto {{ form.articoloId }}.
      </div>
      <div *ngIf="articleError" class="article-warning">⚠️ {{ articleError }}</div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" [disabled]="saving">
          {{ saving ? 'Salvataggio...' : '💾 Salva' }}
        </button>
      </div>
    </form>
  </div>
</div>`,
  styles: [`
.page{padding:0}.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.page-header h1{font-size:22px;font-weight:700;color:#1e2a3a}.header-actions{display:flex;gap:10px}
.card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:24px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.form-group{display:flex;flex-direction:column;gap:6px}
.form-group label{font-weight:600;color:#475569;font-size:13px}
.form-control{padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:100%}
.form-actions{margin-top:24px;display:flex;gap:10px}
.loading{text-align:center;padding:40px;color:#64748b}
.error-block{background:#fee2e2;color:#b91c1c;padding:12px 16px;border-radius:8px;margin-bottom:12px}
.article-info{margin-top:16px;padding:12px;background:#eff6ff;border-radius:8px;color:#1e3a8a}
.article-warning{margin-top:12px;padding:10px;background:#fff7ed;color:#9a3412;border-radius:8px}
.btn{padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:14px;font-weight:500}.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:#1a73e8;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}.btn-danger{background:#e53935;color:#fff}
`]
})
export class StoriaNoleggioDetailComponent implements OnInit {
  isNew = false;
  loading = false;
  saving = false;
  error = '';
  articleError = '';
  id: number | null = null;
  articleHistory: StoriaProdottoResponse[] = [];

  form: StoriaNoleggioRequest = {
    docId: 0,
    clienteId: undefined,
    articoloId: undefined,
    matricola: '',
    quantita: undefined,
    dataDoc: '',
    sezionale: ''
  };

  constructor(
    private service: StoriaNoleggiService,
    private productsService: StoriaProdottiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadArticleHistory();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || idParam === 'new') {
      this.isNew = true;
      return;
    }
    this.id = Number(idParam);
    this.loading = true;
    try {
      const data: StoriaNoleggioResponse = await this.service.getById1({ docId: this.id });
      this.form = {
        docId: data.docId ?? 0,
        clienteId: data.clienteId,
        articoloId: data.articoloId,
        matricola: data.matricola ?? '',
        quantita: data.quantita,
        dataDoc: data.dataDoc ?? '',
        sezionale: data.sezionale ?? ''
      };
      await this.loadArticleForRental(data.articoloId);
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel caricamento';
    } finally {
      this.loading = false;
    }
  }

  get availableArticles(): StoriaProdottoResponse[] {
    const byArticleId = new Map<number, StoriaProdottoResponse>();
    for (const article of this.articleHistory) {
      if (article.articoloId === undefined) continue;
      const existing = byArticleId.get(article.articoloId);
      if (!existing || (article.aggiornatoIl ?? article.dataDoc ?? '') >
          (existing.aggiornatoIl ?? existing.dataDoc ?? '')) {
        byArticleId.set(article.articoloId, article);
      }
    }
    return [...byArticleId.values()].sort((a, b) => this.articleLabel(a).localeCompare(this.articleLabel(b)));
  }

  get selectedArticle(): StoriaProdottoResponse | undefined {
    return this.articleHistory.find(article => article.articoloId === this.form.articoloId);
  }

  articleLabel(article: StoriaProdottoResponse): string {
    const details = [
      article.codiceArticolo,
      article.descrizione ?? article.categoriaDescrizione
    ].filter(Boolean).join(' — ');
    return details || `Articolo ID ${article.articoloId ?? 'non disponibile'}`;
  }

  private async loadArticleHistory(): Promise<void> {
    this.articleError = '';
    try {
      this.articleHistory = await this.productsService.getAll();
    } catch (e: any) {
      this.articleError = e?.message ?? 'Impossibile recuperare i prodotti';
    }
  }

  private async loadArticleForRental(articleId?: number): Promise<void> {
    if (articleId === undefined || this.articleHistory.some(article => article.articoloId === articleId)) return;
    try {
      const history = await this.productsService.getByArticolo({ articoloId: articleId });
      this.articleHistory = [...this.articleHistory, ...history];
    } catch (e: any) {
      this.articleError = e?.message ?? 'Impossibile recuperare i dettagli dell’articolo';
    }
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      if (this.isNew) {
        await this.service.create1({ body: this.form });
      } else {
        await this.service.update1({ docId: this.id!, body: this.form });
      }
      this.router.navigate(['/noleggi']);
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel salvataggio';
    } finally {
      this.saving = false;
    }
  }

  async deleteItem(): Promise<void> {
    if (!confirm('Eliminare questo noleggio?')) return;
    try {
      await this.service.delete1({ docId: this.id! });
      this.router.navigate(['/noleggi']);
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nell\'eliminazione';
    }
  }

  goBack(): void {
    this.router.navigate(['/noleggi']);
  }
}
