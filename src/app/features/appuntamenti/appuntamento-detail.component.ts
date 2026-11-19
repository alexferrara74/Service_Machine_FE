import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Appuntamento, AppuntamentiService, AppuntamentoRequest, EsitoAppuntamento, ridimensionaFoto, TipoIntervento
} from './appuntamenti.service';
import { StoriaNoleggiManutenzioniService } from '../../api/services/storia-noleggi-manutenzioni.service';
import { NoleggioManutenzioneResponse } from '../../api/models/noleggio-manutenzione-response';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-appuntamento-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>{{ isNew ? 'Nuovo appuntamento' : 'Appuntamento' }}</h1>
          <p class="meta" *ngIf="contesto">{{ contesto }}</p>
        </div>
        <a routerLink="/appuntamenti" class="btn btn-secondary">← Agenda</a>
      </header>
      <div *ngIf="error" class="error-block">{{ error }}</div>
      <div *ngIf="info" class="success-block">{{ info }}</div>
      <div *ngIf="loading" class="loading">Caricamento...</div>

      <div *ngIf="!loading" class="card" [class.ordinaria]="form.tipo === 'ORDINARIA'" [class.straordinaria]="form.tipo === 'STRAORDINARIA'">
        <p *ngIf="chiuso" class="banner" [class.annullato]="item?.stato === 'ANNULLATO'">
          {{ item?.stato === 'COMPLETATO' ? 'Appuntamento completato' + (item?.completatoIl ? ' il ' + (item?.completatoIl | date:'dd/MM/yyyy HH:mm') : '') : 'Appuntamento annullato' }}
        </p>
        <div class="form-grid">
          <label>Data e ora
            <input class="form-control" type="datetime-local" [(ngModel)]="form.dataPrevista" name="data" [disabled]="chiuso">
          </label>
          <label>Tipo di intervento
            <select class="form-control" [(ngModel)]="form.tipo" name="tipo" [disabled]="chiuso">
              <option value="ORDINARIA">Ordinaria (verde)</option>
              <option value="STRAORDINARIA">Straordinaria (blu)</option>
            </select>
            <small>Lo decide l’operatore: puoi cambiarlo anche all’ultimo momento.</small>
          </label>
        </div>

        <label class="full">Resoconto
          <textarea class="form-control" rows="6" [(ngModel)]="form.resoconto" name="resoconto" [disabled]="chiuso"
            placeholder="Cosa hai trovato e cosa hai fatto sull’apparecchio…"></textarea>
        </label>

        <fieldset class="esito" [disabled]="chiuso">
          <legend>Esito dell’intervento</legend>
          <label class="radio"><input type="radio" name="esito" value="POSITIVO" [(ngModel)]="form.esito" (ngModelChange)="onEsito()"> Positivo — apparecchio in ordine</label>
          <label class="radio"><input type="radio" name="esito" value="NEGATIVO" [(ngModel)]="form.esito" (ngModelChange)="onEsito()"> Negativo — problema riscontrato</label>
          <div *ngIf="form.esito === 'POSITIVO'" class="proroghe">
            <p class="meta">Con esito positivo puoi allungare i tempi della manutenzione ordinaria e/o straordinaria. Metti 0 dove non serve.</p>
            <label>Allunga la prossima <strong class="ord">ordinaria</strong> di (giorni)
              <input class="form-control" type="number" min="0" max="365" [(ngModel)]="form.giorniProrogaOrdinaria" name="prorogaOrd">
              <small>Scade il {{ stato?.prossimaManutenzioneIl ? (stato?.prossimaManutenzioneIl | date:'dd/MM/yyyy':'UTC') : '—' }}; intervallo {{ intervallo }} giorni, proposta {{ suggerita }}.</small>
            </label>
            <label>Allunga la prossima <strong class="str">straordinaria</strong> di (giorni)
              <input class="form-control" type="number" min="0" max="365" [(ngModel)]="form.giorniProrogaStraordinaria" name="prorogaStr">
              <small>Scade il {{ stato?.prossimaStraordinariaIl ? (stato?.prossimaStraordinariaIl | date:'dd/MM/yyyy':'UTC') : 'non calcolabile (manca la configurazione)' }}.</small>
            </label>
          </div>
        </fieldset>

        <section class="foto" *ngIf="!isNew">
          <h2>Foto ({{ item?.foto?.length ?? 0 }})</h2>
          <div class="griglia">
            <figure *ngFor="let f of item?.foto">
              <a [href]="urlFoto(f.id)" target="_blank" rel="noopener"><img [src]="urlFoto(f.id)" [alt]="f.nomeFile" loading="lazy"></a>
              <button *ngIf="item?.stato !== 'ANNULLATO'" type="button" class="del" (click)="eliminaFoto(f.id)" aria-label="Elimina foto">✕</button>
            </figure>
          </div>
          <label *ngIf="item?.stato !== 'ANNULLATO'" class="scatta">
            <input type="file" accept="image/*" capture="environment" multiple (change)="aggiungiFoto($event)" [disabled]="uploading">
            <span class="btn btn-secondary">{{ uploading ? 'Caricamento…' : '📷 Scatta o scegli foto' }}</span>
          </label>
        </section>
        <p *ngIf="isNew" class="meta">Salva l’appuntamento per poter aggiungere le foto.</p>

        <div class="azioni">
          <ng-container *ngIf="!chiuso">
            <button type="button" class="btn btn-secondary" [disabled]="busy" (click)="salva()">{{ isNew ? 'Crea appuntamento' : 'Salva bozza' }}</button>
            <button *ngIf="!isNew" type="button" class="btn btn-primary" [disabled]="busy" (click)="completa()">Completa appuntamento</button>
            <button *ngIf="!isNew" type="button" class="btn btn-secondary" [disabled]="busy" (click)="annulla()">Annulla appuntamento</button>
            <button *ngIf="!isNew" type="button" class="btn btn-danger" [disabled]="busy" (click)="elimina()">Elimina</button>
          </ng-container>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}.page-header h1{margin:0}
    .meta{color:var(--muted);margin:4px 0 0}
    .card{padding:20px;background:var(--surface);border-radius:12px;box-shadow:0 2px 8px #00000012;border-top:6px solid var(--line);display:grid;gap:16px}
    .card.ordinaria{border-top-color:var(--ordinaria)}.card.straordinaria{border-top-color:var(--straordinaria)}
    .banner{margin:0;padding:10px;border-radius:8px;background:var(--ok-bg);color:var(--ok);font-weight:600}.banner.annullato{background:var(--paper-2);color:var(--muted)}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
    label{display:grid;gap:6px;font-weight:600}small{font-weight:400;color:var(--muted)}
    .form-control{padding:10px;border:1px solid var(--field);border-radius:6px;font:inherit;width:100%}
    .esito{border:1px solid var(--line);border-radius:10px;padding:12px;display:grid;gap:10px}
    .radio{display:flex;gap:8px;align-items:center;font-weight:500}.proroghe{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.proroghe .meta{grid-column:1/-1;margin:0}.ord{color:var(--ordinaria)}.str{color:var(--straordinaria)}
    .foto h2{font-size:16px;margin:0 0 10px}
    .griglia{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:12px}
    figure{position:relative;margin:0}figure img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block}
    .del{position:absolute;top:4px;right:4px;border:0;border-radius:50%;width:26px;height:26px;background:#000a;color:#fff;cursor:pointer}
    .scatta input{position:absolute;opacity:0;width:1px;height:1px}
    .azioni{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .btn{padding:10px 16px;border:0;border-radius:6px;cursor:pointer;text-decoration:none;color:inherit;display:inline-block;font:inherit}
    .btn:disabled{opacity:.5;cursor:not-allowed}.btn-primary{background:var(--petrol);color:#fff}.btn-secondary{background:var(--line)}.btn-danger{background:var(--danger);color:#fff}
    .error-block{margin:12px 0;padding:10px;background:var(--danger-bg);color:var(--danger)}
    .success-block{margin:12px 0;padding:10px;background:var(--ok-bg);color:var(--ok)}.loading{padding:20px;text-align:center}
    @media(max-width:600px){.azioni .btn{flex:1}}
  `]
})
export class AppuntamentoDetailComponent implements OnInit, OnDestroy {
  docId = 0;
  id: number | null = null;
  isNew = false;
  loading = true;
  busy = false;
  uploading = false;
  error = '';
  info = '';
  item: Appuntamento | null = null;
  stato: NoleggioManutenzioneResponse | null = null;
  form = { dataPrevista: '', tipo: 'ORDINARIA' as TipoIntervento, esito: null as EsitoAppuntamento | null, resoconto: '', giorniProrogaOrdinaria: null as number | null, giorniProrogaStraordinaria: null as number | null };

  constructor(
    private service: AppuntamentiService,
    private manutenzioni: StoriaNoleggiManutenzioniService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get chiuso(): boolean { return !!this.item && this.item.stato !== 'PROGRAMMATO'; }

  get intervallo(): number {
    return this.item?.intervalloManutenzioneGiorni ?? this.stato?.intervalloManutenzioneGiorni ?? 0;
  }

  get suggerita(): number {
    const intervallo = this.item?.intervalloManutenzioneGiorni ?? this.stato?.intervalloManutenzioneGiorni ?? 0;
    return Math.floor(intervallo / 2);
  }

  get contesto(): string {
    const cliente = this.item?.cliente ?? this.stato?.cliente;
    const matricola = this.item?.matricola ?? this.stato?.matricola;
    return [cliente, matricola ? 'matricola ' + matricola : '', 'noleggio ' + this.docId].filter(Boolean).join(' · ');
  }

  async ngOnInit(): Promise<void> {
    this.docId = Number(this.route.snapshot.paramMap.get('docId'));
    const idParam = this.route.snapshot.paramMap.get('id');
    this.isNew = !idParam;
    try {
      if (idParam) {
        this.id = Number(idParam);
        this.item = await this.service.get(this.docId, this.id);
        this.riempi(this.item);
      } else {
        this.form.dataPrevista = this.adesso();
      }
      this.manutenzioni.getStato(this.docId).then(s => this.stato = s).catch(() => { /* solo informativo */ });
    } catch (e) { this.error = errorMessage(e, 'Errore nel caricamento dell’appuntamento'); }
    finally { this.loading = false; }
  }

  onEsito(): void {
    if (this.form.esito !== 'POSITIVO') return;
    if (this.form.giorniProrogaOrdinaria === null) this.form.giorniProrogaOrdinaria = this.suggerita;
    if (this.form.giorniProrogaStraordinaria === null) this.form.giorniProrogaStraordinaria = 0;
  }

  private body(): AppuntamentoRequest {
    return {
      dataPrevista: this.form.dataPrevista.length === 16 ? this.form.dataPrevista + ':00' : this.form.dataPrevista,
      tipo: this.form.tipo,
      esito: this.form.esito,
      resoconto: this.form.resoconto?.trim() || null,
      giorniProrogaOrdinaria: this.form.esito === 'POSITIVO' ? this.form.giorniProrogaOrdinaria : null,
      giorniProrogaStraordinaria: this.form.esito === 'POSITIVO' ? this.form.giorniProrogaStraordinaria : null
    };
  }

  private riempi(a: Appuntamento): void {
    this.item = a;
    this.form = {
      dataPrevista: a.dataPrevista.slice(0, 16), tipo: a.tipo, esito: a.esito ?? null,
      resoconto: a.resoconto ?? '', giorniProrogaOrdinaria: a.giorniProrogaOrdinaria ?? null, giorniProrogaStraordinaria: a.giorniProrogaStraordinaria ?? null
    };
  }

  private adesso(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  private async esegui(op: () => Promise<void>, fallback: string): Promise<void> {
    this.busy = true; this.error = ''; this.info = '';
    try { await op(); } catch (e) { this.error = errorMessage(e, fallback); } finally { this.busy = false; }
  }

  salva(): Promise<void> {
    return this.esegui(async () => {
      if (this.isNew) {
        const creato = await this.service.crea(this.docId, this.body());
        await this.router.navigate(['/appuntamenti', this.docId, creato.id]);
        this.isNew = false; this.id = creato.id; this.riempi(creato);
      } else {
        this.riempi(await this.service.salva(this.docId, this.id!, this.body()));
      }
      this.info = 'Salvato.';
    }, 'Errore nel salvataggio');
  }

  completa(): Promise<void> {
    if (!this.form.esito) { this.error = 'Per completare indica l’esito: positivo o negativo.'; return Promise.resolve(); }
    if (!this.form.resoconto?.trim()) { this.error = 'Per completare scrivi il resoconto.'; return Promise.resolve(); }
    const tipo = this.form.tipo === 'ORDINARIA' ? 'ordinaria' : 'straordinaria';
    const proroghe: string[] = [];
    if (this.form.esito === 'POSITIVO' && this.form.giorniProrogaOrdinaria) proroghe.push(`ordinaria +${this.form.giorniProrogaOrdinaria} giorni`);
    if (this.form.esito === 'POSITIVO' && this.form.giorniProrogaStraordinaria) proroghe.push(`straordinaria +${this.form.giorniProrogaStraordinaria} giorni`);
    const msg = `Completare l’appuntamento come ${tipo}?` + (proroghe.length ? ` Prossime manutenzioni allungate: ${proroghe.join(', ')}.` : '');
    if (!confirm(msg)) return Promise.resolve();
    return this.esegui(async () => {
      this.riempi(await this.service.completa(this.docId, this.id!, this.body()));
      this.info = 'Appuntamento completato e registrato nello storico del noleggio.';
    }, 'Errore nella chiusura dell’appuntamento');
  }

  annulla(): Promise<void> {
    if (!confirm('Annullare questo appuntamento?')) return Promise.resolve();
    return this.esegui(async () => { this.riempi(await this.service.annulla(this.docId, this.id!)); }, 'Errore nell’annullamento');
  }

  elimina(): Promise<void> {
    if (!confirm('Eliminare definitivamente questo appuntamento e le sue foto?')) return Promise.resolve();
    return this.esegui(async () => {
      await this.service.elimina(this.docId, this.id!);
      await this.router.navigate(['/appuntamenti']);
    }, 'Errore nell’eliminazione');
  }

  private anteprime = new Map<number, string>();
  private richieste = new Set<number>();

  // Usata dal template: la prima volta avvia il download autenticato, poi restituisce l'URL locale.
  urlFoto(fotoId: number): string | null {
    if (!this.richieste.has(fotoId) && this.id !== null) {
      this.richieste.add(fotoId);
      this.service.urlFoto(this.docId, this.id, fotoId).then(u => this.anteprime.set(fotoId, u)).catch(() => this.richieste.delete(fotoId));
    }
    return this.anteprime.get(fotoId) ?? null;
  }

  ngOnDestroy(): void { this.anteprime.forEach(u => URL.revokeObjectURL(u)); }

  async aggiungiFoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length || this.id === null) return;
    this.uploading = true; this.error = '';
    try {
      for (const file of files) {
        const { blob, nome } = await ridimensionaFoto(file);
        await this.service.caricaFoto(this.docId, this.id, blob, nome);
      }
    } catch (e) { this.error = errorMessage(e, 'Errore nel caricamento della foto'); }
    finally {
      this.uploading = false; input.value = '';
      this.item = await this.service.get(this.docId, this.id).catch(() => this.item);
    }
  }

  async eliminaFoto(fotoId: number): Promise<void> {
    if (!confirm('Eliminare questa foto?')) return;
    await this.esegui(async () => {
      await this.service.eliminaFoto(this.docId, this.id!, fotoId);
      this.item = await this.service.get(this.docId, this.id!);
    }, 'Errore nell’eliminazione della foto');
  }
}
