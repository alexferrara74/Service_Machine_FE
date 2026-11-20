import { Component, ElementRef, HostListener, Input, ViewChild, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface OpzioneRicerca {
  value: unknown;
  label: string;
  /** Titolo del gruppo sotto cui compare (es. "Importati dall'ERP"); le voci dello stesso gruppo vanno consecutive. */
  gruppo?: string;
  /** Testo in più su cui cerca ma che non cambia l'etichetta (es. il codice). */
  cerca?: string;
}

interface Riga { opzione?: OpzioneRicerca; titolo?: string; indice: number; }

const MAX_RIGHE = 100;
const normalizza = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Menu a tendina con ricerca: si scrive per filtrare (più parole = tutte devono comparire, senza badare
 * a maiuscole e accenti), si sceglie con il mouse, il tocco o le frecce + Invio. Funziona con ngModel.
 */
@Component({
  selector: 'app-select-ricerca',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectRicercaComponent), multi: true }],
  template: `
    <div class="sr">
      <input #campo type="text" class="form-control sr-input" role="combobox" autocomplete="off"
             [attr.id]="inputId" [attr.aria-label]="ariaLabel || null" [attr.aria-expanded]="aperto" aria-autocomplete="list"
             [attr.aria-controls]="aperto ? idLista : null" [attr.aria-activedescendant]="aperto && attiva >= 0 ? idLista + '-' + attiva : null"
             [placeholder]="placeholder" [value]="aperto ? ricerca : etichettaSelezionata" [disabled]="disabilitato"
             (focus)="apri()" (click)="apri()" (input)="scrivi($any($event.target).value)" (keydown)="tasto($event)">
      <span class="sr-freccia" aria-hidden="true">▾</span>
      <ul *ngIf="aperto" #lista class="sr-lista" role="listbox" [attr.id]="idLista" [style.top.px]="posizione.top"
          [style.left.px]="posizione.left" [style.width.px]="posizione.width" [style.max-height.px]="posizione.maxHeight">
        <ng-container *ngFor="let r of righe">
          <li *ngIf="r.titolo !== undefined" class="sr-gruppo" role="presentation">{{ r.titolo }}</li>
          <li *ngIf="r.opzione" role="option" class="sr-opzione" [attr.id]="idLista + '-' + r.indice"
              [class.attiva]="r.indice === attiva" [class.scelta]="r.opzione.value === valore"
              [attr.aria-selected]="r.opzione.value === valore" (mousedown)="$event.preventDefault()" (click)="scegli(r.opzione)">
            {{ r.opzione.label }}
          </li>
        </ng-container>
        <li *ngIf="!righe.length" class="sr-vuoto" role="presentation">Nessun risultato</li>
        <li *ngIf="oltre > 0" class="sr-vuoto" role="presentation">…altri {{ oltre }} risultati: scrivi per restringere</li>
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sr { position: relative; }
    /* lo stile dei campi è definito dentro le singole pagine: qui si ripete, così il menu ha sempre lo stesso aspetto */
    .sr-input { width: 100%; box-sizing: border-box; padding: 9px 28px 9px 12px; border: 1px solid var(--field); border-radius: 6px;
      font: inherit; background: var(--surface); color: var(--ink); cursor: pointer; text-overflow: ellipsis; }
    .sr-input::placeholder { color: var(--muted); }
    .sr-input:focus-visible { outline: 2px solid var(--petrol); outline-offset: 1px; }
    .sr-input:disabled { cursor: not-allowed; background: var(--paper-2); color: var(--muted); }
    .sr-freccia { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; font-size: 12px; }
    .sr-lista { position: fixed; z-index: 1000; margin: 0; padding: 4px 0; list-style: none; overflow-y: auto; background: var(--surface);
      border: 1px solid var(--field); border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, .18); }
    .sr-gruppo { padding: 8px 12px 4px; font-size: 12px; font-weight: 600; color: var(--muted); }
    .sr-opzione { padding: 9px 12px; cursor: pointer; min-height: 40px; display: flex; align-items: center; }
    .sr-opzione.attiva, .sr-opzione:hover { background: var(--info-bg); }
    .sr-opzione.scelta { font-weight: 600; color: var(--petrol); }
    .sr-vuoto { padding: 10px 12px; color: var(--muted); font-size: 13px; }
  `]
})
export class SelectRicercaComponent implements ControlValueAccessor {
  @Input() set opzioni(v: OpzioneRicerca[]) { this._opzioni = v ?? []; this.ricalcola(); }
  get opzioni(): OpzioneRicerca[] { return this._opzioni; }
  /** Voce fissa in cima (es. "Tutti i clienti" o "Nessuno") che corrisponde al valore undefined. */
  @Input() voceVuota = '';
  @Input() placeholder = 'Seleziona…';
  @Input() inputId = '';
  @Input() ariaLabel = '';

  @ViewChild('campo') campo?: ElementRef<HTMLInputElement>;

  private host = inject(ElementRef);
  private _opzioni: OpzioneRicerca[] = [];
  private static contatore = 0;
  readonly idLista = `sr-lista-${++SelectRicercaComponent.contatore}`;

  valore: unknown = undefined;
  aperto = false;
  disabilitato = false;
  ricerca = '';
  attiva = -1;
  righe: Riga[] = [];
  oltre = 0;
  posizione = { top: 0, left: 0, width: 0, maxHeight: 280 };

  private onChange: (v: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  get etichettaSelezionata(): string {
    if (this.valore === undefined || this.valore === null || this.valore === '') return this.voceVuota;
    return this._opzioni.find(o => o.value === this.valore)?.label ?? '';
  }

  writeValue(v: unknown): void { this.valore = v ?? undefined; }
  registerOnChange(fn: (v: unknown) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabilitato = d; }

  apri(): void {
    if (this.aperto || this.disabilitato) return;
    this.aperto = true;
    this.ricerca = '';
    this.posiziona();
    this.ricalcola();
    this.attiva = Math.max(0, this.righeOpzione().findIndex(r => r.opzione!.value === this.valore));
    queueMicrotask(() => this.campo?.nativeElement.select());
  }

  chiudi(): void {
    if (!this.aperto) return;
    this.aperto = false;
    this.onTouched();
  }

  scrivi(testo: string): void {
    this.ricerca = testo;
    this.ricalcola();
    this.attiva = this.righeOpzione().length ? 0 : -1;
  }

  scegli(o: OpzioneRicerca): void {
    this.valore = o.value;
    this.onChange(o.value);
    this.chiudi();
  }

  tasto(ev: KeyboardEvent): void {
    const opzioni = this.righeOpzione();
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (!this.aperto) { this.apri(); return; }
      if (!opzioni.length) return;
      this.attiva = (this.attiva + (ev.key === 'ArrowDown' ? 1 : -1) + opzioni.length) % opzioni.length;
      queueMicrotask(() => this.host.nativeElement.querySelector('.sr-opzione.attiva')?.scrollIntoView({ block: 'nearest' }));
    } else if (ev.key === 'Enter' && this.aperto) {
      ev.preventDefault(); // dentro un modulo Invio non deve inviarlo
      const r = opzioni[this.attiva];
      if (r) this.scegli(r.opzione!);
    } else if (ev.key === 'Escape' && this.aperto) {
      ev.stopPropagation();
      this.chiudi();
    } else if (ev.key === 'Tab') {
      this.chiudi();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  fuori(ev: MouseEvent): void {
    if (this.aperto && !this.host.nativeElement.contains(ev.target as Node)) this.chiudi();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  riposiziona(): void { if (this.aperto) this.posiziona(); }

  /** La lista è fixed: non viene tagliata dai contenitori con scorrimento (finestre, schede su mobile). */
  private posiziona(): void {
    const r = (this.campo?.nativeElement ?? this.host.nativeElement).getBoundingClientRect();
    const sotto = window.innerHeight - r.bottom - 12;
    const sopra = r.top - 12;
    const sopraConviene = sotto < 200 && sopra > sotto;
    const maxHeight = Math.max(140, Math.min(320, sopraConviene ? sopra : sotto));
    // almeno 260 px (su telefono il campo può essere stretto) e sempre dentro lo schermo
    const larghezza = Math.min(Math.max(r.width, 260), window.innerWidth - 16);
    this.posizione = {
      top: sopraConviene ? Math.max(8, r.top - maxHeight - 2) : r.bottom + 2,
      left: Math.max(8, Math.min(r.left, window.innerWidth - larghezza - 8)), width: larghezza, maxHeight
    };
  }

  private righeOpzione(): Riga[] { return this.righe.filter(r => r.opzione); }

  private ricalcola(): void {
    const parole = normalizza(this.ricerca).split(/\s+/).filter(Boolean);
    const trovate = this._opzioni.filter(o => {
      if (!parole.length) return true;
      const testo = normalizza(`${o.label} ${o.cerca ?? ''}`);
      return parole.every(p => testo.includes(p));
    });
    this.oltre = Math.max(0, trovate.length - MAX_RIGHE);
    const righe: Riga[] = [];
    let indice = 0;
    if (this.voceVuota && !parole.length) {
      righe.push({ opzione: { value: undefined, label: this.voceVuota }, indice: indice++ });
    }
    let gruppoCorrente: string | undefined;
    for (const o of trovate.slice(0, MAX_RIGHE)) {
      if (o.gruppo !== gruppoCorrente) {
        gruppoCorrente = o.gruppo;
        if (o.gruppo) righe.push({ titolo: o.gruppo, indice: -1 });
      }
      righe.push({ opzione: o, indice: indice++ });
    }
    this.righe = righe;
  }
}
