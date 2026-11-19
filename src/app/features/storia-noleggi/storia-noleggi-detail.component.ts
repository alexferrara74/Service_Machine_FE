import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoriaNoleggiService } from '../../api/services/storia-noleggi.service';
import { StoriaNoleggioResponse } from '../../api/models/storia-noleggio-response';
import { StoriaNoleggioRequest } from '../../api/models/storia-noleggio-request';
import { ClientiService } from '../../api/services/clienti.service';
import { ClienteResponse } from '../../api/models/cliente-response';
import { AttrezzatureService } from '../../api/services/attrezzature.service';
import { AttrezzaturaResponse } from '../../api/models/attrezzatura-response';
import { CatalogoProdottiService } from '../catalogo/catalogo-prodotti.service';
import { ProdottoCatalogo } from '../catalogo/prodotto-catalogo';
import { NoleggioDocumentoService } from './noleggio-documento.service';
import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-storia-noleggi-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page">
  <div class="page-header">
    <h1>{{ isNew ? '+ Nuovo Noleggio' : '✏️ Modifica Noleggio' }}</h1>
    <div class="header-actions">
      <button class="btn btn-secondary" (click)="goBack()">← Indietro</button>
      <button *ngIf="!isNew" class="btn btn-secondary" (click)="planAssistance()">📅 Pianifica assistenza</button>
      <button *ngIf="!isNew" class="btn btn-danger" (click)="deleteItem()">🗑️ Elimina</button>
    </div>
  </div>
  <div class="card">
    <div *ngIf="loading" class="loading">⏳ Caricamento...</div>
    <div *ngIf="error" class="error-block">⚠️ {{ error }}</div>
    <form *ngIf="!loading" (ngSubmit)="save()">
      <div class="form-grid">
        <div class="form-group" *ngIf="!isNew">
          <label>Doc ID</label>
          <input type="number" [ngModel]="id" name="docId" class="form-control" readonly />
        </div>
        <div class="form-group">
          <label>Cliente *</label>
          <select [(ngModel)]="form.clienteId" name="clienteId" class="form-control" required>
            <option [ngValue]="undefined">Seleziona un cliente</option>
            <option *ngFor="let c of clienti" [ngValue]="c.id">{{ clienteLabel(c) }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Prodotto (attrezzatura) *</label>
          <select [ngModel]="form.articoloId" (ngModelChange)="onArticleChange($event)" name="articoloId" class="form-control" required>
            <option [ngValue]="undefined">Seleziona un articolo</option>
            <option *ngFor="let article of articles" [ngValue]="article.articoloId">
              {{ articleLabel(article) }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Matricola *</label>
          <input list="matricole" [(ngModel)]="form.matricola" name="matricola" class="form-control" placeholder="Matricola (automatica o manuale)" autocomplete="off" required />
          <datalist id="matricole">
            <option *ngFor="let a of matricoleArticolo" [value]="a.matricola">{{ a.descrizione }}</option>
          </datalist>
        </div>
        <div class="form-group">
          <label>Quantità</label>
          <input type="number" min="0" [(ngModel)]="form.quantita" name="quantita" class="form-control" placeholder="Quantità" />
        </div>
        <div class="form-group">
          <label>Data Doc *</label>
          <input type="date" [(ngModel)]="form.dataDoc" name="dataDoc" class="form-control" required />
        </div>
        <div class="form-group">
          <label>Sezionale</label>
          <input type="text" [(ngModel)]="form.sezionale" name="sezionale" class="form-control" placeholder="Sezionale" />
        </div>
      </div>
      <div *ngIf="articleError" class="article-warning">⚠️ {{ articleError }}</div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" [disabled]="saving">
          {{ saving ? 'Salvataggio...' : '💾 Salva' }}
        </button>
      </div>
    </form>
    <section class="document-section">
      <h2>Documento di noleggio</h2>
      <p *ngIf="isNew" class="document-hint">Il PDF selezionato verrà allegato al salvataggio del noleggio.</p>
      <p *ngIf="documentName">Documento attuale: <strong>{{ documentName }}</strong></p>
      <p *ngIf="!documentName && !documentLoading">Nessun documento caricato.</p>
      <p *ngIf="documentLoading">Verifica documento in corso...</p>
      <label class="document-picker">
        Carica un PDF (massimo 20 MB)
        <input #documentInput type="file" accept=".pdf,application/pdf" (change)="selectDocument($event)" />
      </label>
      <p *ngIf="documentFile" class="document-selection">{{ documentFile.name }}</p>
      <div class="document-actions">
        <button *ngIf="!isNew" type="button" class="btn btn-primary" [disabled]="!documentFile || documentUploading" (click)="uploadDocument(documentInput)">
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
.page-header h1{font-size:22px;font-weight:700;color:var(--ink)}.header-actions{display:flex;gap:10px}
.card{background:var(--surface);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:24px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.form-group{display:flex;flex-direction:column;gap:6px}
.form-group label{font-weight:600;color:var(--muted);font-size:13px}
.form-control{padding:10px 12px;border:1px solid var(--field);border-radius:6px;font-size:14px;width:100%}
.form-actions{margin-top:24px;display:flex;gap:12px;flex-wrap:wrap}.document-hint{color:var(--muted);font-size:13px;margin:0 0 4px}
.loading{text-align:center;padding:40px;color:var(--muted)}
.error-block{background:var(--danger-bg);color:var(--danger);padding:12px 16px;border-radius:8px;margin-bottom:12px}
.article-info{margin-top:16px;padding:12px;background:var(--info-bg);border-radius:8px;color:var(--info)}
.article-warning{margin-top:12px;padding:10px;background:var(--warn-bg);color:var(--warn);border-radius:8px}
.document-section{margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}
.document-section h2{margin:0 0 12px;color:var(--ink);font-size:18px}
.document-picker{display:grid;gap:8px;max-width:400px;margin:16px 0;font-weight:600;color:var(--muted)}
.document-actions{display:flex;gap:10px;flex-wrap:wrap}
.document-selection{color:var(--muted)}
.success-block{padding:10px;background:var(--ok-bg);color:var(--ok);border-radius:8px}
.btn{padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:14px;font-weight:500}.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:var(--petrol);color:#fff}.btn-secondary{background:var(--line);color:var(--ink)}.btn-danger{background:var(--danger);color:#fff}
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
  articles: ProdottoCatalogo[] = [];
  clienti: ClienteResponse[] = [];
  attrezzature: AttrezzaturaResponse[] = [];

  get matricole(): AttrezzaturaResponse[] {
    return this.attrezzature.filter(a => a.matricola);
  }

  // shortcut: l'API attrezzature non espone articoloId, si abbina per descrizione; da sostituire con articoloId se esposto.
  get matricoleArticolo(): AttrezzaturaResponse[] {
    const article = this.articles.find(a => a.articoloId === this.form.articoloId);
    if (!article) return this.matricole;
    const description = article.descrizione?.trim().toLowerCase();
    return this.matricole.filter(a => a.descrizione?.trim().toLowerCase() === description);
  }

  onArticleChange(articoloId: number | undefined): void {
    this.form.articoloId = articoloId;
    const matches = articoloId === undefined ? [] : this.matricoleArticolo;
    // Una sola matricola nota: precompilata; altrimenti campo libero.
    this.form.matricola = matches.length === 1 ? matches[0].matricola! : '';
  }

  form: StoriaNoleggioRequest = {
    clienteId: undefined,
    articoloId: undefined,
    matricola: '',
    quantita: undefined,
    dataDoc: '',
    sezionale: ''
  };

  planAssistance(): void {
    if (this.id !== null) this.router.navigate(['/calendario'], { queryParams: { docId: this.id } });
  }

  constructor(
    private service: StoriaNoleggiService,
    private clientiService: ClientiService,
    private attrezzatureService: AttrezzatureService,
    private catalogoService: CatalogoProdottiService,
    private documentService: NoleggioDocumentoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadLookups();
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
        clienteId: data.clienteId,
        articoloId: data.articoloId,
        matricola: data.matricola ?? '',
        quantita: data.quantita,
        dataDoc: data.dataDoc ?? '',
        sezionale: data.sezionale ?? ''
      };
      await this.loadDocumentMetadata();
    } catch (e: any) {
      this.error = errorMessage(e, 'Errore nel caricamento');
    } finally {
      this.loading = false;
    }
  }

  clienteLabel(c: ClienteResponse): string {
    return [c.codice, c.ragioneSociale ?? [c.nome, c.cognome].filter(Boolean).join(' ')].filter(Boolean).join(' — ') || `Cliente ${c.id}`;
  }

  articleLabel(article: ProdottoCatalogo): string {
    return [article.codice, article.descrizione].filter(Boolean).join(' — ') || `Articolo ID ${article.articoloId}`;
  }

  private async loadLookups(): Promise<void> {
    this.articleError = '';
    try {
      [this.clienti, this.articles, this.attrezzature] = await Promise.all([
        this.clientiService.getAll5(),
        this.catalogoService.getAttrezzature(),
        this.attrezzatureService.getAll6()
      ]);
    } catch (e: any) {
      this.articleError = errorMessage(e, 'Impossibile recuperare clienti, catalogo o attrezzature');
    }
  }

  private validate(): string {
    if (!this.form.clienteId) return 'Il cliente è obbligatorio.';
    if (!this.form.articoloId) return "L'articolo è obbligatorio.";
    if (!this.form.dataDoc) return 'La data del noleggio è obbligatoria.';
    if (!this.form.matricola?.trim()) return 'La matricola è obbligatoria.';
    if (!this.matricole.some(a => a.matricola === this.form.matricola?.trim())) {
      return 'Matricola non trovata: selezionane una dall\'elenco.';
    }
    if (this.form.quantita !== undefined && this.form.quantita !== null && this.form.quantita < 0) {
      return 'La quantità non può essere negativa.';
    }
    return '';
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
      this.documentError = errorMessage(error, 'Errore durante il caricamento del documento.');
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
      this.documentError = errorMessage(error, 'Errore durante il download del documento.');
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
        this.documentError = errorMessage(error, 'Impossibile verificare il documento del noleggio.');
      }
    } finally {
      this.documentLoading = false;
    }
  }

  async save(): Promise<void> {
    this.error = this.validate();
    if (this.error) return;
    this.saving = true;
    try {
      if (this.isNew) {
        const saved = await this.service.create1({ body: this.form });
        this.id = saved.docId ?? null;
        this.isNew = false;
        const pending = this.documentFile;
        if (pending && this.id !== null) {
          try {
            this.documentName = (await this.documentService.upload(this.id, pending)).nomeFile;
            this.documentFile = null;
          } catch (error) {
            // Il noleggio è già salvato: resta in pagina per ritentare l'upload.
            this.documentError = errorMessage(error, 'Noleggio salvato, ma caricamento del PDF non riuscito.');
          }
        }
        await this.router.navigate(['/noleggi', this.id]);
        if (!pending) await this.loadDocumentMetadata();
        return;
      }
      await this.service.update1({ docId: this.id!, body: this.form });
      this.router.navigate(['/noleggi']);
    } catch (e: any) {
      this.error = errorMessage(e, 'Errore nel salvataggio');
    } finally {
      this.saving = false;
    }
  }

  async deleteItem(): Promise<void> {
    if (!confirm(`Eliminare questo noleggio?\n\nVerranno eliminati anche il PDF allegato e lo storico delle manutenzioni. L'operazione non è reversibile.`)) return;
    try {
      await this.service.delete1({ docId: this.id! });
      this.router.navigate(['/noleggi']);
    } catch (e: any) {
      this.error = errorMessage(e, 'Errore nell\'eliminazione');
    }
  }

  goBack(): void {
    this.router.navigate(['/noleggi']);
  }

}
