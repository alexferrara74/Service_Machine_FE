import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttrezzatureService } from '../../api/services/attrezzature.service';
import { AttrezzaturaResponse } from '../../api/models/attrezzatura-response';
import { CatalogoProdottiService } from '../catalogo/catalogo-prodotti.service';
import { ProdottoCatalogo } from '../catalogo/prodotto-catalogo';
import { errorMessage } from '../../shared/error-message';

export interface AttrezzaturaCreata {
  articolo: ProdottoCatalogo;
  attrezzatura: AttrezzaturaResponse;
}

/**
 * Creazione rapida di una attrezzatura dal form del noleggio: una nuova matricola per un articolo già
 * a catalogo (ERP o manuale) oppure, se l'articolo non esiste, anche l'articolo stesso.
 * Non è un <form>: vive dentro quello del noleggio e un form annidato non è HTML valido.
 */
@Component({
  selector: 'app-attrezzatura-quick-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quick" role="group" aria-label="Nuova attrezzatura" (keydown.enter)="$event.preventDefault(); save()">
      <h3>Nuova attrezzatura</h3>
      <p class="hint">Viene salvata come attrezzatura creata a mano, separata da quelle importate dall'ERP.</p>
      <div *ngIf="error" class="error-block" role="alert">⚠️ {{ error }}</div>

      <fieldset *ngIf="articolo">
        <legend>Articolo</legend>
        <label class="radio"><input type="radio" [value]="false" [(ngModel)]="nuovoArticolo" [ngModelOptions]="{standalone: true}">
          Usa l’articolo selezionato: <strong>{{ articolo.codice }} — {{ articolo.descrizione }}</strong></label>
        <label class="radio"><input type="radio" [value]="true" [(ngModel)]="nuovoArticolo" [ngModelOptions]="{standalone: true}">
          Crea un nuovo articolo a catalogo</label>
      </fieldset>

      <div class="grid" *ngIf="nuovoArticolo || !articolo">
        <label>Codice articolo *<input class="form-control" [(ngModel)]="codice" [ngModelOptions]="{standalone: true}" maxlength="50"></label>
        <label>Descrizione articolo *<input class="form-control" [(ngModel)]="descrizione" [ngModelOptions]="{standalone: true}" maxlength="255" placeholder="Es. Tagliaerba 53 cm"></label>
      </div>
      <div class="grid">
        <label>Matricola *<input class="form-control" [(ngModel)]="matricola" [ngModelOptions]="{standalone: true}" maxlength="100"></label>
        <label>Marca<input class="form-control" [(ngModel)]="marca" [ngModelOptions]="{standalone: true}" maxlength="100"></label>
        <label>Modello<input class="form-control" [(ngModel)]="modello" [ngModelOptions]="{standalone: true}" maxlength="100"></label>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" [disabled]="saving" (click)="save()">{{ saving ? 'Salvataggio...' : 'Crea e seleziona' }}</button>
        <button type="button" class="btn btn-secondary" [disabled]="saving" (click)="cancelled.emit()">Annulla</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; grid-column: 1 / -1; }
    .quick { padding: 16px; background: var(--info-bg); border-radius: 8px; }
    h3 { margin: 0 0 4px; font-size: 16px; }
    .hint { margin: 0 0 12px; color: var(--muted); font-size: 13px; }
    fieldset { margin: 0 0 12px; padding: 10px 12px; border: 1px solid var(--field); border-radius: 8px; display: grid; gap: 6px; }
    legend { padding: 0 6px; font-size: 13px; font-weight: 600; color: var(--muted); }
    .radio { display: flex; gap: 8px; align-items: center; font-weight: 400; font-size: 14px; color: var(--ink); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px; }
    label { display: grid; gap: 6px; font-weight: 600; font-size: 13px; color: var(--muted); }
    .radio { display: flex; }
    .form-control { padding: 9px 12px; border: 1px solid var(--field); border-radius: 6px; font: inherit; width: 100%; background: var(--surface); color: var(--ink); }
    .actions { display: flex; gap: 10px; }
    .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: var(--petrol); color: #fff; }
    .btn-secondary { background: var(--line); color: var(--ink); }
    .error-block { background: var(--danger-bg); color: var(--danger); padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; }
  `]
})
export class AttrezzaturaQuickCreateComponent {
  /** Articolo già scelto nel noleggio: se presente si propone di usarlo. */
  @Input() set articoloSelezionato(value: ProdottoCatalogo | undefined) {
    this.articolo = value;
    this.nuovoArticolo = !value;
  }
  /** Emesso appena l'articolo esiste a catalogo, anche se la creazione della matricola poi fallisce. */
  /** Articoli che hanno già una matricola collegata: non si possono collegare a una seconda. */
  @Input() articoliGiaCollegati: number[] = [];
  @Output() articoloCreato = new EventEmitter<ProdottoCatalogo>();
  @Output() created = new EventEmitter<AttrezzaturaCreata>();
  @Output() cancelled = new EventEmitter<void>();

  articolo?: ProdottoCatalogo;
  nuovoArticolo = true;
  codice = '';
  descrizione = '';
  matricola = '';
  marca = '';
  modello = '';
  saving = false;
  error = '';

  constructor(private attrezzature: AttrezzatureService, private catalogo: CatalogoProdottiService) {}

  async save(): Promise<void> {
    if (this.saving) return;
    const creaArticolo = this.nuovoArticolo || !this.articolo;
    if (creaArticolo && !this.codice.trim()) { this.error = 'Il codice articolo è obbligatorio.'; return; }
    if (creaArticolo && !this.descrizione.trim()) { this.error = 'La descrizione dell’articolo è obbligatoria.'; return; }
    if (!this.matricola.trim()) { this.error = 'La matricola è obbligatoria.'; return; }

    this.saving = true;
    this.error = '';
    try {
      let articolo = this.articolo;
      if (creaArticolo) {
        articolo = await this.catalogo.create({ codice: this.codice.trim(), descrizione: this.descrizione.trim(), isAttrezzatura: true });
        // Se la matricola fallisce, un nuovo tentativo riusa questo articolo invece di crearne un duplicato.
        this.articolo = articolo;
        this.nuovoArticolo = false;
        this.articoloCreato.emit(articolo);
      }
      const attrezzatura = await this.attrezzature.create6({
        body: {
          matricola: this.matricola.trim(),
          // La descrizione coincide con quella dell'articolo: è così che il noleggio abbina le matricole all'articolo.
          descrizione: articolo!.descrizione,
          articoloId: this.articoliGiaCollegati.includes(articolo!.articoloId) ? undefined : articolo!.articoloId,
          marca: this.marca.trim() || undefined,
          modello: this.modello.trim() || undefined,
          stato: 'DISPONIBILE'
        }
      });
      this.created.emit({ articolo: articolo!, attrezzatura });
    } catch (e) {
      this.error = errorMessage(e, 'Errore nella creazione dell’attrezzatura');
    } finally {
      this.saving = false;
    }
  }
}
