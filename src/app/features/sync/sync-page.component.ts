import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

interface SyncStatistics {
  clienti: number;
  prodottiCatalogo: number;
  attrezzature: number;
  accessori: number;
  righeNoleggio: number;
  righeFattura: number;
  clientiConProdottiFatturati: number;
}

interface SyncResponse {
  status: string;
  message: string;
  details: { statistiche: SyncStatistics };
}

@Component({
  selector: 'app-sync-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="sync-page">
      <h1>Sincronizzazione ERP</h1>
      <p>Importa clienti, catalogo prodotti/attrezzature/accessori, prodotti fatturati associati ai clienti e canoni di noleggio fatturati.</p>
      <button type="button" class="sync-button" [disabled]="loading" (click)="sync()">
        {{ loading ? 'Sincronizzazione in corso...' : 'Sincronizza dati ERP' }}
      </button>
      <p *ngIf="success" class="success">{{ success }}</p>
      <p *ngIf="error" class="error">{{ error }}</p>
      <ul *ngIf="statistics" class="statistics">
        <li>Clienti: {{ statistics.clienti }}</li>
        <li>Prodotti catalogo: {{ statistics.prodottiCatalogo }}</li>
        <li>Attrezzature: {{ statistics.attrezzature }}</li>
        <li>Accessori: {{ statistics.accessori }}</li>
        <li>Righe noleggio: {{ statistics.righeNoleggio }}</li>
        <li>Righe fattura associate: {{ statistics.righeFattura }}</li>
        <li>Clienti con prodotti fatturati: {{ statistics.clientiConProdottiFatturati }}</li>
      </ul>
    </section>
  `,
  styles: [`
    .sync-page { padding: 24px; }
    h1 { margin: 0 0 20px; color: #1e2a3a; font-size: 22px; }
    .sync-button { padding: 12px 20px; border: 0; border-radius: 6px; background: #2563eb; color: white; font-size: 15px; cursor: pointer; }
    .sync-button:disabled { opacity: .6; cursor: wait; }
    .success { color: #166534; }
    .error { color: #b91c1c; }
    .statistics { padding: 14px 20px; background: #f1f5f9; border-radius: 8px; line-height: 1.8; }
  `]
})
export class SyncPageComponent {
  loading = false;
  success = '';
  error = '';
  statistics?: SyncStatistics;

  constructor(private http: HttpClient) {}

  async sync(): Promise<void> {
    this.loading = true;
    this.success = '';
    this.error = '';
    this.statistics = undefined;
    try {
      const result = await firstValueFrom(
        this.http.post<SyncResponse>('/api/sync/erp', null)
      );
      this.success = result.message || 'Sincronizzazione completata.';
      this.statistics = result.details?.statistiche;
    } catch (error) {
      this.error = error instanceof HttpErrorResponse
        ? error.error?.message || `Sincronizzazione non riuscita: ${error.message}`
        : 'Errore durante la sincronizzazione.';
    } finally {
      this.loading = false;
    }
  }
}
