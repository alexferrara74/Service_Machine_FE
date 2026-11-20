import { AuthService } from '../../core/auth.service';
import { AdminOnlyDirective } from '../../core/admin-only.directive';
import { Component, OnInit, inject } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { StoriaNoleggiManutenzioniService } from '../../api/services/storia-noleggi-manutenzioni.service';
import { NoleggioManutenzioneEventoResponse } from '../../api/models/noleggio-manutenzione-evento-response';
import { Appuntamento, AppuntamentiService } from '../appuntamenti/appuntamenti.service';
import { InterventiStoricoComponent } from '../appuntamenti/interventi-storico.component';
import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from '../../shared/error-message';
import { isManuale } from '../../shared/origine';
import { ClienteQuickCreateComponent } from './cliente-quick-create.component';
import { AttrezzaturaCreata, AttrezzaturaQuickCreateComponent } from './attrezzatura-quick-create.component';
import { OpzioneRicerca, SelectRicercaComponent } from '../../shared/select-ricerca.component';
import { proponiCodiceArticolo } from '../../shared/codice-articolo';


@Component({
  selector: 'app-storia-noleggi-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ClienteQuickCreateComponent, AttrezzaturaQuickCreateComponent, AdminOnlyDirective, InterventiStoricoComponent, SelectRicercaComponent],
  template: `
<div class="page">
  <div class="page-header">
    <h1>{{ isNew ? '+ Nuovo Noleggio' : '✏️ Modifica Noleggio' }}</h1>
    <div class="header-actions">
      <button class="btn btn-secondary" (click)="goBack()">← Indietro</button>
      <button *ngIf="!isNew" class="btn btn-secondary" (click)="planAssistance()">📅 Pianifica assistenza</button>
      <button appAdmin *ngIf="!isNew" class="btn btn-danger" (click)="deleteItem()">🗑️ Elimina</button>
    </div>
  </div>
  <div class="card">
    <div *ngIf="loading" class="loading">⏳ Caricamento...</div>
    <div *ngIf="error" class="error-block">⚠️ {{ error }}</div>
    <form *ngIf="!loading" (ngSubmit)="save()"><fieldset class="lock" [disabled]="!auth.isAdmin()">
      <div class="form-grid">
        <div class="form-group" *ngIf="!isNew">
          <label>Doc ID</label>
          <input type="number" [ngModel]="id" name="docId" class="form-control" readonly />
        </div>
        <div class="form-group">
          <label>Cliente *</label>
          <app-select-ricerca [opzioni]="opzioniClienti" placeholder="Cerca il cliente per nome o codice…" [(ngModel)]="form.clienteId" name="clienteId"></app-select-ricerca>
          <button type="button" class="link" (click)="showNewCliente = !showNewCliente; showNewAttrezzatura = false">{{ showNewCliente ? 'Chiudi' : '＋ Nuovo cliente' }}</button>
        </div>
        <app-cliente-quick-create *ngIf="showNewCliente" (created)="onClienteCreated($event)" (cancelled)="showNewCliente = false"></app-cliente-quick-create>
        <div class="form-group">
          <label>Articolo (attrezzatura) *</label>
          <app-select-ricerca [opzioni]="opzioniArticoli" placeholder="Cerca l’articolo per codice o descrizione…" [ngModel]="form.articoloId" (ngModelChange)="onArticleChange($event)" name="articoloId"></app-select-ricerca>
        </div>
        <div class="form-group">
          <label>Matricola *</label>
          <app-select-ricerca [opzioni]="opzioniMatricole" placeholder="Cerca per matricola, descrizione o marca…" [ngModel]="form.matricola" (ngModelChange)="onMatricolaChange($event)" name="matricola"></app-select-ricerca>
          <small *ngIf="matricolaAvviso" class="matricola-avviso">{{ matricolaAvviso }}</small>
          <button type="button" class="link" (click)="showNewAttrezzatura = !showNewAttrezzatura; showNewCliente = false">{{ showNewAttrezzatura ? 'Chiudi' : '＋ Nuova attrezzatura o matricola' }}</button>
        </div>
        <app-attrezzatura-quick-create *ngIf="showNewAttrezzatura" [articoloSelezionato]="articoloSelezionato" [articoliGiaCollegati]="articoliCollegati"
          (articoloCreato)="onArticoloCreato($event)" (created)="onAttrezzaturaCreata($event)" (cancelled)="showNewAttrezzatura = false"></app-attrezzatura-quick-create>
        <div *ngIf="senzaArticolo" class="articolo-mancante">
          <strong>La matricola {{ senzaArticolo.matricola }} non ha ancora un articolo a catalogo.</strong>
          <p>Il noleggio ha bisogno di un articolo: crealo adesso, resterà collegato a questa matricola e comparirà anche nell'elenco degli articoli.</p>
          <div class="articolo-mancante-campi">
            <label>Codice articolo<input class="form-control" [(ngModel)]="nuovoCodice" name="nuovoCodice" maxlength="50"></label>
            <label>Descrizione<input class="form-control" [(ngModel)]="nuovaDescrizione" name="nuovaDescrizione" maxlength="255"></label>
          </div>
          <div *ngIf="erroreArticolo" class="article-warning">⚠️ {{ erroreArticolo }}</div>
          <button type="button" class="btn btn-secondary" [disabled]="creandoArticolo" (click)="creaArticoloPerMatricola()">{{ creandoArticolo ? 'Creazione…' : 'Crea articolo e collega' }}</button>
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
      </fieldset><div class="form-actions">
        <button appAdmin type="submit" class="btn btn-primary" [disabled]="saving">
          {{ saving ? 'Salvataggio...' : '💾 Salva' }}
        </button>
      </div>
    </form>
    <section *ngIf="!isNew && id !== null" class="document-section">
      <h2>Appuntamenti</h2>
      <p><a class="btn btn-primary" [routerLink]="['/appuntamenti', id, 'new']">+ Nuovo appuntamento</a></p>
      <ul class="appuntamenti" *ngIf="appuntamenti.length; else nessunAppuntamento">
        <li *ngFor="let a of appuntamenti" [class.ordinaria]="a.tipo === 'ORDINARIA'" [class.straordinaria]="a.tipo === 'STRAORDINARIA'">
          <a [routerLink]="['/appuntamenti', id, a.id]">{{ a.dataPrevista | date:'dd/MM/yyyy HH:mm' }}</a>
          <span>{{ a.tipo === 'ORDINARIA' ? 'Ordinaria' : 'Straordinaria' }} · {{ a.stato === 'PROGRAMMATO' ? 'da fare' : a.stato === 'COMPLETATO' ? 'completato' : 'annullato' }}</span>
          <span *ngIf="a.foto.length">📷 {{ a.foto.length }}</span>
        </li>
      </ul>
      <ng-template #nessunAppuntamento><p class="document-hint">Nessun appuntamento.</p></ng-template>
      <h2 class="sub">Storico interventi</h2>
      <app-interventi-storico [eventi]="eventi"></app-interventi-storico>
    </section>
    <section class="document-section">
      <h2>Documento di noleggio</h2>
      <p *ngIf="isNew" class="document-hint">Il PDF selezionato verrà allegato al salvataggio del noleggio.</p>
      <p *ngIf="documentName">Documento attuale: <strong>{{ documentName }}</strong></p>
      <p *ngIf="!documentName && !documentLoading">Nessun documento caricato.</p>
      <p *ngIf="documentLoading">Verifica documento in corso...</p>
      <label appAdmin class="document-picker">
        Carica un PDF (massimo 20 MB)
        <input #documentInput type="file" accept=".pdf,application/pdf" (change)="selectDocument($event)" />
      </label>
      <p *ngIf="documentFile" class="document-selection">{{ documentFile.name }}</p>
      <div class="document-actions">
        <button appAdmin *ngIf="!isNew" type="button" class="btn btn-primary" [disabled]="!documentFile || documentUploading" (click)="uploadDocument(documentInput)">
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
.articolo-mancante{grid-column:1/-1;padding:14px;border:1px solid var(--warn);background:var(--warn-bg);border-radius:8px;display:grid;gap:10px}
.articolo-mancante p{margin:0;color:var(--ink)}
.articolo-mancante-campi{display:grid;grid-template-columns:1fr 2fr;gap:12px}
.articolo-mancante label{display:grid;gap:6px;font-weight:600;font-size:13px;color:var(--muted)}
.articolo-mancante .btn{justify-self:start}
.matricola-avviso{color:var(--muted)}
.article-warning{margin-top:12px;padding:10px;background:var(--warn-bg);color:var(--warn);border-radius:8px}
.document-section{margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}
.document-section h2{margin:0 0 12px;color:var(--ink);font-size:18px}
.document-picker{display:grid;gap:8px;max-width:400px;margin:16px 0;font-weight:600;color:var(--muted)}
.document-actions{display:flex;gap:10px;flex-wrap:wrap}
.document-selection{color:var(--muted)}
.appuntamenti{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:6px}
.appuntamenti li{display:flex;gap:12px;flex-wrap:wrap;padding:8px 10px;border-radius:8px;border-left:5px solid var(--line);background:var(--paper-2)}
.appuntamenti li.ordinaria{border-color:var(--ordinaria);background:var(--ordinaria-bg)}.appuntamenti li.straordinaria{border-color:var(--straordinaria);background:var(--straordinaria-bg)}
.document-section h2.sub{margin-top:20px}.btn{text-decoration:none;display:inline-block}
.success-block{padding:10px;background:var(--ok-bg);color:var(--ok);border-radius:8px}
.btn{padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:14px;font-weight:500}.btn:disabled{opacity:.5;cursor:not-allowed}
.link{align-self:flex-start;border:0;background:none;padding:0;color:var(--petrol);text-decoration:underline;cursor:pointer;font:inherit;font-size:13px}
.btn-primary{background:var(--petrol);color:#fff}.btn-secondary{background:var(--line);color:var(--ink)}.btn-danger{background:var(--danger);color:#fff}
`]
})
export class StoriaNoleggioDetailComponent implements OnInit {
  readonly auth = inject(AuthService);
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
  appuntamenti: Appuntamento[] = [];
  eventi: NoleggioManutenzioneEventoResponse[] = [];
  attrezzature: AttrezzaturaResponse[] = [];

  showNewCliente = false;
  showNewAttrezzatura = false;

  get clientiErp(): ClienteResponse[] { return this.clienti.filter(c => !isManuale(c)); }
  get clientiManuali(): ClienteResponse[] { return this.clienti.filter(c => isManuale(c)); }
  get articlesErp(): ProdottoCatalogo[] { return this.articles.filter(a => !isManuale(a)); }
  get articlesManuali(): ProdottoCatalogo[] { return this.articles.filter(a => isManuale(a)); }
  get articoloSelezionato(): ProdottoCatalogo | undefined {
    return this.articles.find(a => a.articoloId === this.form.articoloId);
  }

  opzioniClienti: OpzioneRicerca[] = [];
  opzioniArticoli: OpzioneRicerca[] = [];
  opzioniMatricole: OpzioneRicerca[] = [];
  matricolaAvviso = '';

  // matricola scelta che non ha ancora un articolo: si crea e si collega al volo, così non si resta mai bloccati
  senzaArticolo?: AttrezzaturaResponse;
  nuovoCodice = '';
  nuovaDescrizione = '';
  creandoArticolo = false;
  erroreArticolo = '';
  private articoloAppenaCreato?: ProdottoCatalogo;

  private ricostruisciOpzioni(): void {
    this.opzioniClienti = [
      ...this.clientiErp.map(c => ({ value: c.id, label: this.clienteLabel(c), gruppo: 'Importati dall\'ERP', cerca: c.partitaIva })),
      ...this.clientiManuali.map(c => ({ value: c.id, label: this.clienteLabel(c), gruppo: 'Creati a mano', cerca: c.partitaIva }))
    ];
    this.opzioniArticoli = [
      ...this.articlesErp.map(a => ({ value: a.articoloId, label: this.articleLabel(a), gruppo: 'Catalogo ERP' })),
      ...this.articlesManuali.map(a => ({ value: a.articoloId, label: this.articleLabel(a), gruppo: 'Creati a mano' }))
    ];
    // Matricole: tutte le attrezzature, quelle dell'articolo scelto per prime
    const voce = (a: AttrezzaturaResponse, gruppo?: string): OpzioneRicerca => ({
      value: a.matricola,
      label: [a.matricola, a.descrizione, [a.marca, a.modello].filter(Boolean).join(' ')].filter(Boolean).join(' — ') + (a.articoloId == null ? ' (senza articolo)' : ''),
      gruppo,
      cerca: [a.marca, a.modello].filter(Boolean).join(' ')
    });
    if (this.form.articoloId == null) {
      this.opzioniMatricole = this.matricole.map(a => voce(a));
    } else {
      const sue = this.matricoleArticolo;
      this.opzioniMatricole = [
        ...sue.map(a => voce(a, "Dell'articolo scelto")),
        ...this.matricole.filter(a => !sue.includes(a)).map(a => voce(a, 'Altre attrezzature'))
      ];
    }
  }

  /** Articoli già collegati a una matricola: un articolo ha una sola matricola collegata. */
  get articoliCollegati(): number[] {
    return this.attrezzature.filter(a => a.articoloId != null).map(a => a.articoloId!);
  }

  onClienteCreated(cliente: ClienteResponse): void {
    this.clienti = [...this.clienti, cliente];
    this.ricostruisciOpzioni();
    this.form.clienteId = cliente.id;
    this.showNewCliente = false;
  }

  /** L'articolo creato compare subito nell'elenco, anche se la matricola poi non viene salvata. */
  onArticoloCreato(articolo: ProdottoCatalogo): void {
    if (!this.articles.some(a => a.articoloId === articolo.articoloId)) this.articles = [...this.articles, articolo];
    this.ricostruisciOpzioni();
    this.form.articoloId = articolo.articoloId;
  }

  onAttrezzaturaCreata(creata: AttrezzaturaCreata): void {
    this.onArticoloCreato(creata.articolo);
    this.attrezzature = [...this.attrezzature, creata.attrezzatura];
    this.ricostruisciOpzioni();
    this.form.matricola = creata.attrezzatura.matricola ?? '';
    this.showNewAttrezzatura = false;
  }

  get matricole(): AttrezzaturaResponse[] {
    return this.attrezzature.filter(a => a.matricola);
  }

  // Le matricole collegate all'articolo; quelle senza collegamento (anagrafica vecchia) si abbinano ancora per descrizione.
  get matricoleArticolo(): AttrezzaturaResponse[] {
    const article = this.articles.find(a => a.articoloId === this.form.articoloId);
    if (!article) return this.matricole;
    const description = article.descrizione?.trim().toLowerCase();
    return this.matricole.filter(a => a.articoloId === article.articoloId
      || (a.articoloId == null && a.descrizione?.trim().toLowerCase() === description));
  }

  /** Scegliendo la matricola si ricava l'articolo: quello collegato, o l'unico a catalogo con la stessa descrizione. */
  onMatricolaChange(matricola: string): void {
    this.form.matricola = matricola ?? '';
    this.matricolaAvviso = '';
    this.senzaArticolo = undefined;
    this.erroreArticolo = '';
    const attrezzatura = this.matricole.find(a => a.matricola === matricola?.trim());
    if (!attrezzatura) return;
    let articolo = attrezzatura.articoloId != null ? this.articles.find(a => a.articoloId === attrezzatura.articoloId) : undefined;
    if (attrezzatura.articoloId != null && !articolo) {
      this.matricolaAvviso = `La matricola è collegata all'articolo ID ${attrezzatura.articoloId}, che non risulta tra le attrezzature del catalogo.`;
      return;
    }
    if (!articolo) {
      const simili = this.articles.filter(a => a.descrizione?.trim().toLowerCase() === attrezzatura.descrizione?.trim().toLowerCase());
      if (simili.length === 1) articolo = simili[0];
    }
    if (articolo) {
      this.form.articoloId = articolo.articoloId;
    } else {
      // nessun articolo: lo si propone da creare (codice e descrizione già compilati) invece di lasciare l'utente senza scelta
      this.form.articoloId = undefined;
      this.senzaArticolo = attrezzatura;
      this.nuovoCodice = proponiCodiceArticolo(attrezzatura.matricola ?? '', this.articles.map(a => a.codice));
      this.nuovaDescrizione = attrezzatura.descrizione?.trim() || [attrezzatura.marca, attrezzatura.modello].filter(Boolean).join(' ') || attrezzatura.matricola || '';
    }
    this.ricostruisciOpzioni();
  }

  async creaArticoloPerMatricola(): Promise<void> {
    const att = this.senzaArticolo;
    if (!att || this.creandoArticolo) return;
    if (!this.nuovoCodice.trim() || !this.nuovaDescrizione.trim()) { this.erroreArticolo = 'Codice e descrizione dell’articolo sono obbligatori.'; return; }
    this.creandoArticolo = true;
    this.erroreArticolo = '';
    try {
      // se il collegamento fallisce, un nuovo tentativo riusa l'articolo già creato invece di farne un doppione
      let articolo = this.articoloAppenaCreato;
      if (!articolo) {
        articolo = await this.catalogoService.create({ codice: this.nuovoCodice.trim(), descrizione: this.nuovaDescrizione.trim(), isAttrezzatura: true });
        this.articoloAppenaCreato = articolo;
        this.onArticoloCreato(articolo);
      }
      const aggiornata = await this.attrezzatureService.update6({
        id: att.id!,
        body: { matricola: att.matricola!, descrizione: att.descrizione, modello: att.modello, marca: att.marca, stato: att.stato, articoloId: articolo.articoloId }
      });
      this.attrezzature = this.attrezzature.map(a => a.id === aggiornata.id ? aggiornata : a);
      this.form.articoloId = articolo.articoloId;
      this.senzaArticolo = undefined;
      this.articoloAppenaCreato = undefined;
      this.ricostruisciOpzioni();
    } catch (e) {
      this.erroreArticolo = errorMessage(e, 'Errore nella creazione dell’articolo');
    } finally {
      this.creandoArticolo = false;
    }
  }

  onArticleChange(articoloId: number | undefined): void {
    this.form.articoloId = articoloId;
    const matches = articoloId === undefined ? [] : this.matricoleArticolo;
    // Una sola matricola nota: precompilata; altrimenti campo libero.
    this.form.matricola = matches.length === 1 ? matches[0].matricola! : '';
    this.senzaArticolo = undefined;
    this.matricolaAvviso = '';
    this.ricostruisciOpzioni();
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
    private appuntamentiService: AppuntamentiService,
    private manutenzioniService: StoriaNoleggiManutenzioniService,
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
      this.ricostruisciOpzioni(); // l'elenco delle matricole dipende dall'articolo del noleggio
      await this.loadDocumentMetadata();
      this.appuntamentiService.perNoleggio(this.id).then(a => this.appuntamenti = a).catch(() => { /* sezione informativa */ });
      this.manutenzioniService.getEventi(this.id).then(e => this.eventi = e).catch(() => { /* sezione informativa */ });
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
      this.ricostruisciOpzioni();
    } catch (e: any) {
      this.articleError = errorMessage(e, 'Impossibile recuperare clienti, catalogo o attrezzature');
    }
  }

  private validate(): string {
    if (!this.form.clienteId) return 'Il cliente è obbligatorio.';
    if (this.senzaArticolo) return `La matricola ${this.senzaArticolo.matricola} non ha un articolo: premi «Crea articolo e collega», oppure scegli un'altra matricola.`;
    if (!this.form.articoloId) return "L'articolo è obbligatorio.";
    if (!this.form.dataDoc) return 'La data del noleggio è obbligatoria.';
    if (!this.form.matricola?.trim()) return 'La matricola è obbligatoria.';
    if (!this.matricole.some(a => a.matricola === this.form.matricola?.trim())) {
      return 'Matricola non trovata: selezionane una dall\'elenco oppure creala con "Nuova attrezzatura o matricola".';
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
    if (!confirm(`Eliminare questo noleggio?\n\nVerranno eliminati anche il PDF allegato, la configurazione delle manutenzioni e gli appuntamenti ancora da fare (con le loro foto). Un noleggio con appuntamenti chiusi o manutenzioni registrate non si può eliminare. L'operazione non è reversibile.`)) return;
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
