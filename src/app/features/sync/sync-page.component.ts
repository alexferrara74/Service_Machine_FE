import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sync-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="sync-page">
      <h1>Sincronizzazione noleggi</h1>
      <button type="button" class="sync-button" [disabled]="loading" (click)="sync()">
        {{ loading ? 'Sincronizzazione in corso...' : 'Sincronizza noleggi' }}
      </button>
      <p *ngIf="success" class="success">{{ success }}</p>
      <p *ngIf="error" class="error">{{ error }}</p>
    </section>
  `,
  styles: [`
    .sync-page { padding: 24px; }
    h1 { margin: 0 0 20px; color: #1e2a3a; font-size: 22px; }
    .sync-button { padding: 12px 20px; border: 0; border-radius: 6px; background: #2563eb; color: white; font-size: 15px; cursor: pointer; }
    .sync-button:disabled { opacity: .6; cursor: wait; }
    .success { color: #166534; }
    .error { color: #b91c1c; }
  `]
})
export class SyncPageComponent {
  loading = false;
  success = '';
  error = '';

  constructor(private http: HttpClient) {}

  async sync(): Promise<void> {
    this.loading = true;
    this.success = '';
    this.error = '';
    try {
      await firstValueFrom(this.http.post<unknown>('/api/noleggi/riarmo-sync', null));
      this.success = 'Sincronizzazione completata.';
    } catch (error) {
      this.error = error instanceof HttpErrorResponse
        ? `Sincronizzazione non riuscita: ${error.message}`
        : 'Errore durante la sincronizzazione.';
    } finally {
      this.loading = false;
    }
  }
}
