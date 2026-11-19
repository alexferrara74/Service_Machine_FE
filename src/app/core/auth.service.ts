import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../api/api-configuration';

export type Ruolo = 'ADMIN' | 'VIEWER';

export interface Sessione {
  token: string;
  scadenza: string; // ISO
  username: string;
  ruolo: Ruolo;
}

export interface Utente {
  id: number;
  username: string;
  ruolo: Ruolo;
  attivo: boolean;
  ultimoAccesso?: string;
  creatoIl?: string;
}

const STORAGE_KEY = 'servizi-pilot.sessione';

/**
 * Sessione dell'utente (token JWT del backend). Il token sta in localStorage per sopravvivere a ricarica e nuove schede;
 * vale poche ore e il backend lo invalida al cambio password o alla disattivazione dell'utente.
 * I controlli sui pulsanti qui sono solo comodità: i permessi veri li applica sempre il backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private config = inject(ApiConfiguration);
  private router = inject(Router);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly sessione = signal<Sessione | null>(this.leggi());
  readonly isAdmin = computed(() => this.sessione()?.ruolo === 'ADMIN');
  readonly isViewer = computed(() => this.sessione()?.ruolo === 'VIEWER');
  readonly username = computed(() => this.sessione()?.username ?? '');

  get token(): string | null {
    const s = this.sessione();
    if (!s) return null;
    if (new Date(s.scadenza).getTime() <= Date.now()) {
      this.chiudi();
      return null;
    }
    return s.token;
  }

  get autenticato(): boolean {
    return this.token !== null;
  }

  async login(username: string, password: string): Promise<void> {
    const s = await firstValueFrom(this.http.post<Sessione>(`${this.config.rootUrl}/api/auth/login`, { username, password }));
    this.sessione.set(s);
    this.salva(s);
  }

  /** Esce dall'applicazione; se la sessione è scaduta o rifiutata dal server ricorda dove stava andando l'utente. */
  logout(returnUrl?: string): void {
    this.chiudi();
    this.router.navigate(['/login'], returnUrl && returnUrl !== '/login' ? { queryParams: { redirect: returnUrl } } : {});
  }

  cambiaPassword(passwordAttuale: string, nuovaPassword: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.config.rootUrl}/api/auth/password`, { passwordAttuale, nuovaPassword }));
  }

  private chiudi(): void {
    this.sessione.set(null);
    try { if (this.browser) localStorage.removeItem(STORAGE_KEY); } catch { /* storage non disponibile */ }
  }

  private salva(s: Sessione): void {
    try { if (this.browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* resta valida in memoria */ }
  }

  private leggi(): Sessione | null {
    if (!this.browser) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Sessione;
      return s?.token && s.ruolo && new Date(s.scadenza).getTime() > Date.now() ? s : null;
    } catch {
      return null;
    }
  }
}
