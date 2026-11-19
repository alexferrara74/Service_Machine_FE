import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NoleggioManutenzioneEventoResponse } from '../../api/models/noleggio-manutenzione-evento-response';

/** Storico interventi di un noleggio: verde = ordinaria, blu = straordinaria. */
@Component({
  selector: 'app-interventi-storico',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ul class="storico" *ngIf="eventi.length; else nessuno">
      <li *ngFor="let e of eventi" [class.ordinaria]="e.tipo === 'ORDINARIA'" [class.straordinaria]="e.tipo === 'STRAORDINARIA'">
        <span class="badge">{{ e.tipo === 'ORDINARIA' ? 'Ordinaria' : 'Straordinaria' }}</span>
        <span class="quando">{{ e.eseguitaIl | date:'dd/MM/yyyy HH:mm' }}</span>
        <span *ngIf="e.esito" class="esito">{{ e.esito === 'POSITIVO' ? 'Esito positivo' : 'Esito negativo' }}</span>
        <span *ngIf="e.giorniProrogaOrdinaria" class="esito">Ordinaria +{{ e.giorniProrogaOrdinaria }} gg</span>
        <span *ngIf="e.giorniProrogaStraordinaria" class="esito">Straordinaria +{{ e.giorniProrogaStraordinaria }} gg</span>
        <span *ngIf="e.note" class="nota">{{ e.note }}</span>
        <a *ngIf="e.appuntamentoId" [routerLink]="['/appuntamenti', e.docId, e.appuntamentoId]">Apri appuntamento</a>
      </li>
    </ul>
    <ng-template #nessuno><span class="vuoto">Nessun intervento registrato.</span></ng-template>
  `,
  styles: [`
    .storico{list-style:none;margin:0;padding:0;display:grid;gap:6px;min-width:280px}
    li{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding:7px 10px;border-radius:8px;border-left:5px solid;font-size:12px}
    li.ordinaria{background:var(--ordinaria-bg);border-color:var(--ordinaria)}
    li.straordinaria{background:var(--straordinaria-bg);border-color:var(--straordinaria)}
    .badge{font-weight:700;color:#fff;padding:2px 8px;border-radius:999px}
    li.ordinaria .badge{background:var(--ordinaria)}li.straordinaria .badge{background:var(--straordinaria)}
    .quando{font-weight:600}.esito{color:var(--muted)}.nota{flex-basis:100%;color:var(--ink)}
    a{color:var(--petrol)}.vuoto{color:var(--muted)}
  `]
})
export class InterventiStoricoComponent {
  @Input() eventi: NoleggioManutenzioneEventoResponse[] = [];
}
