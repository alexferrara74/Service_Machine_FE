import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientiService } from '../../api/services/clienti.service';
import { ClienteResponse } from '../../api/models/cliente-response';
import { errorMessage } from '../../shared/error-message';

/**
 * Creazione rapida di un cliente dal form del noleggio, per non perdere i dati già inseriti.
 * Non è un <form>: vive dentro quello del noleggio e un form annidato non è HTML valido.
 */
@Component({
  selector: 'app-cliente-quick-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quick" role="group" aria-label="Nuovo cliente" (keydown.enter)="$event.preventDefault(); save()">
      <h3>Nuovo cliente</h3>
      <p class="hint">Verrà salvato come cliente creato a mano, separato da quelli importati dall'ERP.</p>
      <div *ngIf="error" class="error-block" role="alert">⚠️ {{ error }}</div>
      <div class="grid">
        <label>Codice *<input class="form-control" [(ngModel)]="codice" [ngModelOptions]="{standalone: true}" maxlength="50"></label>
        <label>Ragione sociale *<input class="form-control" [(ngModel)]="ragioneSociale" [ngModelOptions]="{standalone: true}" maxlength="255"></label>
        <label>Telefono<input class="form-control" [(ngModel)]="telefono" [ngModelOptions]="{standalone: true}" maxlength="50"></label>
        <label>Email<input class="form-control" type="email" [(ngModel)]="email" [ngModelOptions]="{standalone: true}" maxlength="255"></label>
        <label>Partita IVA<input class="form-control" [(ngModel)]="partitaIva" [ngModelOptions]="{standalone: true}" maxlength="20"></label>
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
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    label { display: grid; gap: 6px; font-weight: 600; font-size: 13px; color: var(--muted); }
    .form-control { padding: 9px 12px; border: 1px solid var(--field); border-radius: 6px; font: inherit; width: 100%; background: var(--surface); color: var(--ink); }
    .actions { display: flex; gap: 10px; margin-top: 14px; }
    .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: var(--petrol); color: #fff; }
    .btn-secondary { background: var(--line); color: var(--ink); }
    .error-block { background: var(--danger-bg); color: var(--danger); padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; }
  `]
})
export class ClienteQuickCreateComponent {
  @Output() created = new EventEmitter<ClienteResponse>();
  @Output() cancelled = new EventEmitter<void>();

  // Codice proposto per evitare un campo obbligatorio vuoto; l'operatore può cambiarlo.
  codice = 'MAN-' + Date.now().toString().slice(-6);
  ragioneSociale = '';
  telefono = '';
  email = '';
  partitaIva = '';
  saving = false;
  error = '';

  constructor(private service: ClientiService) {}

  async save(): Promise<void> {
    if (this.saving) return;
    if (!this.codice.trim()) { this.error = 'Il codice è obbligatorio.'; return; }
    if (!this.ragioneSociale.trim()) { this.error = 'La ragione sociale è obbligatoria.'; return; }
    this.saving = true;
    this.error = '';
    try {
      const cliente = await this.service.create5({
        body: {
          codice: this.codice.trim(),
          ragioneSociale: this.ragioneSociale.trim(),
          telefono: this.telefono.trim() || undefined,
          email: this.email.trim() || undefined,
          partitaIva: this.partitaIva.trim() || undefined
        }
      });
      this.created.emit(cliente);
    } catch (e) {
      this.error = errorMessage(e, 'Errore nella creazione del cliente');
    } finally {
      this.saving = false;
    }
  }
}
