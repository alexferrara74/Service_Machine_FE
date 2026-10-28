import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { StoriaNoleggiService } from '../../api/services/storia-noleggi.service';
import { StoriaNoleggioResponse } from '../../api/models/storia-noleggio-response';
import { StoriaNoleggioRequest } from '../../api/models/storia-noleggio-request';
import { StoriaProdottiService } from '../../api/services/storia-prodotti.service';
import { StoriaProdottoResponse } from '../../api/models/storia-prodotto-response';
import { NoleggioDocumentoService } from './noleggio-documento.service';
import { HttpErrorResponse } from '@angular/common/http';

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
    <section *ngIf="!isNew && id !== null" class="document-section">
      <h2>Documento di noleggio</h2>
      <p *ngIf="documentName">Documento attuale: <strong>{{ documentName }}</strong></p>
      <p *ngIf="!documentName && !documentLoading">Nessun documento caricato.</p>
      <p *ngIf="documentLoading">Verifica documento in corso...</p>
      <label class="document-picker">
        Carica un PDF (massimo 20 MB)
        <input #documentInput type="file" accept=".pdf,application/pdf" (change)="selectDocument($event)" />
      </label>
      <p *ngIf="documentFile" class="document-selection">{{ documentFile.name }}</p>
      <div class="document-actions">
        <button type="button" class="btn btn-primary" [disabled]="!documentFile || documentUploading" (click)="uploadDocument(documentInput)">
          {{ documentUploading ? 'Caricamento...' : documentName ? 'Sostituisci PDF' : 'Carica PDF' }}
        </button>
        <button *ngIf="documentName" type="button" class="btn btn-secondary" [disabled]="documentDownloading" (click)="downloadDocument()">
          {{ documentDownloading ? 'Download...' : 'Scarica PDF' }}
        </button>
      </div>
      <p *ngIf="documentError" class="error-block">{{ documentError }}</p>
      <p *ngIf="documentSuccess" class="success-block">{{ documentSuccess }}</p>
    </section>
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
.document-section{margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0}
.document-section h2{margin:0 0 12px;color:#1e2a3a;font-size:18px}
.document-picker{display:grid;gap:8px;max-width:400px;margin:16px 0;font-weight:600;color:#475569}
.document-actions{display:flex;gap:10px;flex-wrap:wrap}
.document-selection{color:#475569}
.success-block{padding:10px;background:#dcfce7;color:#166534;border-radius:8px}
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
  documentName = '';
  documentError = '';
  documentSuccess = '';
  documentLoading = false;
  documentUploading = false;
  documentDownloading = false;
  documentFile: File | null = null;
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
    private documentService: NoleggioDocumentoService,
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
      await this.loadDocumentMetadata();
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

  selectDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.documentError = '';
    this.documentSuccess = '';
    if (!file) {
      this.documentFile = null;
      return;
    }
    if (!file.name.toLocaleLowerCase().endsWith('.pdf') || file.size === 0) {
      this.documentError = 'Seleziona un documento PDF non vuoto.';
      input.value = '';
      this.documentFile = null;
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.documentError = 'Il documento supera la dimensione massima di 20 MB.';
      input.value = '';
      this.documentFile = null;
      return;
    }
    this.documentFile = file;
  }

  async uploadDocument(input: HTMLInputElement): Promise<void> {
    if (this.id === null || !this.documentFile) return;
    this.documentUploading = true;
    this.documentError = '';
    this.documentSuccess = '';
    try {
      const result = await this.documentService.upload(this.id, this.documentFile);
      this.documentName = result.nomeFile;
      this.documentFile = null;
      input.value = '';
      this.documentSuccess = 'Documento caricato correttamente.';
    } catch (error) {
      this.documentError = this.message(error, 'Errore durante il caricamento del documento.');
    } finally {
      this.documentUploading = false;
    }
  }

  async downloadDocument(): Promise<void> {
    if (this.id === null) return;
    this.documentDownloading = true;
    this.documentError = '';
    try {
      const response = await this.documentService.download(this.id);
      if (!response.body) throw new Error('Il server ha restituito un documento vuoto.');
      const url = URL.createObjectURL(response.body);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.documentName || 'documento-noleggio.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      this.documentError = this.message(error, 'Errore durante il download del documento.');
    } finally {
      this.documentDownloading = false;
    }
  }

  private async loadDocumentMetadata(): Promise<void> {
    if (this.id === null) return;
    this.documentLoading = true;
    this.documentError = '';
    try {
      const metadata = await this.documentService.getMetadata(this.id);
      this.documentName = metadata.nomeFile;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.documentName = '';
      } else {
        this.documentError = this.message(error, 'Impossibile verificare il documento del noleggio.');
      }
    } finally {
      this.documentLoading = false;
    }
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      if (this.isNew) {
        const saved = await this.service.create1({ body: this.form });
        this.id = saved.docId ?? this.form.docId;
        this.isNew = false;
        await this.router.navigate(['/noleggi', this.id]);
        await this.loadDocumentMetadata();
        return;
      }
      await this.service.update1({ docId: this.id!, body: this.form });
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

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
