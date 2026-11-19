import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ScaffaleLayout, ScaffaleRequest, ScaffaliService } from './scaffali.service';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-scaffali-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Scaffali</h1>
        <div class="actions">
          <a routerLink="/magazzino-3d" class="btn btn-secondary">Vista 3D</a>
          <button type="button" class="btn btn-primary" (click)="nuovo()">+ Nuovo scaffale</button>
        </div>
      </header>
      <div *ngIf="error" class="error-block">{{ error }}</div>

      <section *ngIf="editing" class="card">
        <h2>{{ editId === null ? 'Nuovo scaffale' : 'Modifica scaffale ' + original?.codice }}</h2>
        <form (ngSubmit)="save()" class="form-grid">
          <label>Codice (vuoto = automatico)<input class="form-control" [(ngModel)]="form.codice" name="codice" maxlength="20" placeholder="es. A01"></label>
          <label>Zona<input class="form-control" [(ngModel)]="form.zona" name="zona" required></label>
          <label>Larghezza (cm)<input class="form-control" type="number" min="1" [(ngModel)]="form.larghezzaCm" name="l" required></label>
          <label>Profondità (cm)<input class="form-control" type="number" min="1" [(ngModel)]="form.profonditaCm" name="p" required></label>
          <label>Altezza (cm)<input class="form-control" type="number" min="1" [(ngModel)]="form.altezzaCm" name="h" required></label>
          <label>Posizione X centro (cm)<input class="form-control" type="number" min="0" [(ngModel)]="form.posXCm" name="x" required></label>
          <label>Posizione Y centro (cm)<input class="form-control" type="number" min="0" [(ngModel)]="form.posYCm" name="y" required></label>
          <label>Rotazione
            <select class="form-control" [(ngModel)]="form.rotazioneGradi" name="rot">
              <option *ngFor="let r of [0, 90, 180, 270]" [ngValue]="r">{{ r }}°</option>
            </select>
          </label>
          <label>Ripiani (dal basso)<input class="form-control" type="number" min="1" max="50" [(ngModel)]="form.numeroRipiani" name="rip" required></label>
          <label>Posizioni per ripiano<input class="form-control" type="number" min="1" max="50" [(ngModel)]="form.posizioniPerRipiano" name="pos" required></label>
          <p class="hint">Verranno generate {{ (form.numeroRipiani || 0) * (form.posizioniPerRipiano || 0) }} etichette, ad esempio
            <strong>{{ esempio }}</strong>. X e Y indicano il centro dello scaffale nella pianta del magazzino
            (X verso destra, Y verso il basso); il fronte guarda verso il basso a rotazione 0°.</p>
          <div class="form-actions">
            <button class="btn btn-primary" [disabled]="saving">{{ saving ? 'Salvataggio...' : 'Salva' }}</button>
            <button type="button" class="btn btn-secondary" (click)="annulla()">Annulla</button>
          </div>
        </form>
      </section>

      <section class="card">
        <div *ngIf="loading" class="loading">Caricamento...</div>
        <div *ngIf="!loading && items.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Codice</th><th>Zona</th><th>L × P × H (cm)</th><th>Posizione (cm)</th><th>Rot.</th><th>Griglia</th><th>Occupate</th><th></th></tr></thead>
            <tbody><tr *ngFor="let s of items">
              <td><strong>{{ s.codice }}</strong></td><td>{{ s.zona }}</td>
              <td>{{ s.larghezzaCm }} × {{ s.profonditaCm }} × {{ s.altezzaCm }}</td>
              <td>{{ s.posXCm }}, {{ s.posYCm }}</td><td>{{ s.rotazioneGradi }}°</td>
              <td>{{ s.numeroRipiani }} × {{ s.posizioniPerRipiano }}</td>
              <td>{{ occupate(s) }} / {{ s.celle.length }}</td>
              <td class="row-actions">
                <button type="button" class="btn btn-secondary" (click)="modifica(s)">Modifica</button>
                <button type="button" class="btn btn-danger" (click)="elimina(s)">Elimina</button>
              </td>
            </tr></tbody>
          </table>
        </div>
        <p *ngIf="!loading && !items.length">Nessuno scaffale definito. Crea il primo per generare le etichette.</p>
      </section>
    </section>
  `,
  styles: [`
    .page-header,.form-actions,.actions{display:flex;align-items:center;gap:12px}
    .page-header{justify-content:space-between;margin-bottom:20px}
    .page-header h1{margin:0}
    .form-actions{grid-column:1/-1;justify-content:flex-end;flex-wrap:wrap}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
    .form-grid label{display:grid;gap:6px}
    .hint{grid-column:1/-1;margin:0;color:var(--muted)}
    .card{margin-bottom:20px;padding:20px;background:var(--surface);border-radius:12px;box-shadow:0 2px 8px #00000012}
    .form-control{min-width:0;padding:9px;border:1px solid var(--field);border-radius:6px}
    .table-wrap{overflow-x:auto}
    .data-table{width:100%;border-collapse:collapse}
    .data-table td,.data-table th{text-align:left;padding:9px;border-bottom:1px solid var(--line)}
    .row-actions{display:flex;gap:8px;justify-content:flex-end}
    .error-block{margin:12px 0;padding:10px;background:var(--danger-bg);color:var(--danger)}
    .btn{padding:9px 14px;border:0;border-radius:6px;cursor:pointer;white-space:nowrap;text-decoration:none;color:inherit}
    .btn-primary{background:var(--petrol);color:white}
    .btn-secondary{background:var(--line)}
    .btn-danger{background:var(--danger);color:white}
    .loading{padding:20px;text-align:center}
    @media(max-width:600px){.page-header{align-items:stretch;flex-direction:column}.card{padding:14px}}
  `]
})
export class ScaffaliPageComponent implements OnInit {
  items: ScaffaleLayout[] = [];
  loading = false;
  saving = false;
  editing = false;
  editId: number | null = null;
  original: ScaffaleLayout | null = null;
  error = '';
  form: ScaffaleRequest = this.vuoto();

  constructor(private service: ScaffaliService) {}

  ngOnInit(): Promise<void> { return this.load(); }

  get esempio(): string {
    const codice = (this.form.codice?.trim() || (this.original?.codice ?? 'S01')).toUpperCase();
    return `${codice}-R01-P01`;
  }

  occupate(s: ScaffaleLayout): number { return s.celle.filter(c => c.articoli.length).length; }

  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try { this.items = await this.service.layout(); }
    catch (e) { this.error = errorMessage(e, 'Errore nel caricamento degli scaffali'); }
    finally { this.loading = false; }
  }

  nuovo(): void { this.editId = null; this.original = null; this.form = this.vuoto(); this.editing = true; this.error = ''; }

  modifica(s: ScaffaleLayout): void {
    this.editId = s.scaffaleId; this.original = s; this.editing = true; this.error = '';
    this.form = {
      codice: s.codice, zona: s.zona, larghezzaCm: s.larghezzaCm, profonditaCm: s.profonditaCm, altezzaCm: s.altezzaCm,
      posXCm: s.posXCm, posYCm: s.posYCm, rotazioneGradi: s.rotazioneGradi,
      numeroRipiani: s.numeroRipiani, posizioniPerRipiano: s.posizioniPerRipiano
    };
  }

  annulla(): void { this.editing = false; }

  async save(): Promise<void> {
    this.saving = true; this.error = '';
    try {
      const body = { ...this.form, codice: this.form.codice?.trim() || undefined };
      if (this.editId === null) await this.service.create(body);
      else await this.service.update(this.editId, body);
      this.editing = false;
      await this.load();
    } catch (e) { this.error = errorMessage(e, 'Errore nel salvataggio dello scaffale'); }
    finally { this.saving = false; }
  }

  async elimina(s: ScaffaleLayout): Promise<void> {
    if (!confirm(`Eliminare lo scaffale ${s.codice} e le sue ${s.celle.length} etichette?`)) return;
    try { await this.service.delete(s.scaffaleId); await this.load(); }
    catch (e) { this.error = errorMessage(e, 'Errore nell’eliminazione dello scaffale'); }
  }

  private vuoto(): ScaffaleRequest {
    return { codice: '', zona: '', larghezzaCm: 200, profonditaCm: 60, altezzaCm: 250, posXCm: 100, posYCm: 100,
      rotazioneGradi: 0, numeroRipiani: 4, posizioniPerRipiano: 4 };
  }
}
