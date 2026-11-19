import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ScaffaleRequest {
  codice?: string;
  zona: string;
  larghezzaCm: number;
  profonditaCm: number;
  altezzaCm: number;
  posXCm: number;
  posYCm: number;
  rotazioneGradi: number;
  numeroRipiani: number;
  posizioniPerRipiano: number;
}

export interface ArticoloInCella {
  posizioneId: number;
  articoloId: number;
  codice?: string;
  descrizione?: string;
  quantita: number;
}

export interface Cella {
  ubicazioneId: number;
  etichetta: string;
  ripiano: number;
  posizione: number;
  articoli: ArticoloInCella[];
}

export interface ScaffaleLayout extends ScaffaleRequest {
  scaffaleId: number;
  codice: string;
  celle: Cella[];
}

@Injectable({ providedIn: 'root' })
export class ScaffaliService {
  private readonly base = '/api/magazzino/scaffali';
  constructor(private http: HttpClient) {}

  layout(): Promise<ScaffaleLayout[]> { return firstValueFrom(this.http.get<ScaffaleLayout[]>(this.base)); }
  getById(id: number): Promise<ScaffaleLayout> { return firstValueFrom(this.http.get<ScaffaleLayout>(`${this.base}/${id}`)); }
  create(body: ScaffaleRequest): Promise<ScaffaleLayout> { return firstValueFrom(this.http.post<ScaffaleLayout>(this.base, body)); }
  update(id: number, body: ScaffaleRequest): Promise<ScaffaleLayout> { return firstValueFrom(this.http.put<ScaffaleLayout>(`${this.base}/${id}`, body)); }
  delete(id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`)); }

  /** Assegna un articolo a una cella (etichetta) con la quantità presente. */
  assegna(ubicazioneId: number, articoloId: number, quantitaPresente: number): Promise<unknown> {
    return firstValueFrom(this.http.post('/api/magazzino/posizioni', { ubicazioneId, articoloId, quantitaPresente }));
  }
  aggiornaQuantita(posizioneId: number, ubicazioneId: number, articoloId: number, quantitaPresente: number): Promise<unknown> {
    return firstValueFrom(this.http.put(`/api/magazzino/posizioni/${posizioneId}`, { ubicazioneId, articoloId, quantitaPresente }));
  }
  rimuovi(posizioneId: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`/api/magazzino/posizioni/${posizioneId}`)); }
}
