import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type TipoIntervento = 'ORDINARIA' | 'STRAORDINARIA';
export type EsitoAppuntamento = 'POSITIVO' | 'NEGATIVO';
export type StatoAppuntamento = 'PROGRAMMATO' | 'COMPLETATO' | 'ANNULLATO';

export interface AppuntamentoRequest {
  dataPrevista: string;
  tipo: TipoIntervento;
  esito?: EsitoAppuntamento | null;
  resoconto?: string | null;
  giorniProrogaOrdinaria?: number | null;
  giorniProrogaStraordinaria?: number | null;
}

export interface FotoAppuntamento { id: number; nomeFile: string; }

export interface Appuntamento {
  id: number;
  docId: number;
  clienteId?: number;
  cliente?: string;
  matricola?: string;
  dataPrevista: string;
  stato: StatoAppuntamento;
  tipo: TipoIntervento;
  esito?: EsitoAppuntamento | null;
  resoconto?: string | null;
  giorniProrogaOrdinaria?: number | null;
  giorniProrogaStraordinaria?: number | null;
  intervalloManutenzioneGiorni?: number | null;
  completatoIl?: string | null;
  foto: FotoAppuntamento[];
}

@Injectable({ providedIn: 'root' })
export class AppuntamentiService {
  constructor(private http: HttpClient) {}

  agenda(stato?: StatoAppuntamento): Promise<Appuntamento[]> {
    return firstValueFrom(this.http.get<Appuntamento[]>('/api/appuntamenti', { params: stato ? { stato } : {} }));
  }
  perNoleggio(docId: number): Promise<Appuntamento[]> { return firstValueFrom(this.http.get<Appuntamento[]>(this.base(docId))); }
  get(docId: number, id: number): Promise<Appuntamento> { return firstValueFrom(this.http.get<Appuntamento>(`${this.base(docId)}/${id}`)); }
  crea(docId: number, body: AppuntamentoRequest): Promise<Appuntamento> { return firstValueFrom(this.http.post<Appuntamento>(this.base(docId), body)); }
  salva(docId: number, id: number, body: AppuntamentoRequest): Promise<Appuntamento> { return firstValueFrom(this.http.put<Appuntamento>(`${this.base(docId)}/${id}`, body)); }
  completa(docId: number, id: number, body: AppuntamentoRequest): Promise<Appuntamento> { return firstValueFrom(this.http.post<Appuntamento>(`${this.base(docId)}/${id}/completa`, body)); }
  annulla(docId: number, id: number): Promise<Appuntamento> { return firstValueFrom(this.http.post<Appuntamento>(`${this.base(docId)}/${id}/annulla`, {})); }
  elimina(docId: number, id: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`${this.base(docId)}/${id}`)); }

  caricaFoto(docId: number, id: number, file: Blob, nome: string): Promise<FotoAppuntamento> {
    const form = new FormData();
    form.append('file', file, nome);
    return firstValueFrom(this.http.post<FotoAppuntamento>(`${this.base(docId)}/${id}/foto`, form));
  }
  eliminaFoto(docId: number, id: number, fotoId: number): Promise<void> { return firstValueFrom(this.http.delete<void>(`${this.base(docId)}/${id}/foto/${fotoId}`)); }
  urlFoto(docId: number, id: number, fotoId: number): string { return `${this.base(docId)}/${id}/foto/${fotoId}`; }

  private base(docId: number): string { return `/api/storia/noleggi/${docId}/appuntamenti`; }
}

/** Riduce le foto del telefono (spesso 5-12 MB) a JPEG max 1600 px; se non riesce restituisce l'originale. */
export async function ridimensionaFoto(file: File, lato = 1600): Promise<{ blob: Blob; nome: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scala = Math.min(1, lato / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scala);
    canvas.height = Math.round(bitmap.height * scala);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (blob) return { blob, nome: (file.name.replace(/\.[^.]+$/, '') || 'foto') + '.jpg' };
  } catch { /* formato non decodificabile dal browser: si invia l'originale */ }
  return { blob: file, nome: file.name || 'foto.jpg' };
}
