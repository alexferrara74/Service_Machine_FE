import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface FotoAppuntamentoCalendario { id?: number; nomeFile?: string; }

/** Foto degli appuntamenti del calendario. Le chiamate passano da HttpClient perché portano il token di accesso. */
@Injectable({ providedIn: 'root' })
export class AppuntamentoFotoService {
  private http = inject(HttpClient);

  carica(id: number, file: Blob, nome: string): Promise<FotoAppuntamentoCalendario> {
    const form = new FormData();
    form.append('file', file, nome);
    return firstValueFrom(this.http.post<FotoAppuntamentoCalendario>(`/api/appuntamenti/${id}/foto`, form));
  }

  elimina(id: number, fotoId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/appuntamenti/${id}/foto/${fotoId}`));
  }

  /** <img src> e <a href> non mandano il token: la foto si scarica qui e si mostra come blob locale. */
  async anteprima(id: number, fotoId: number): Promise<string> {
    const blob = await firstValueFrom(this.http.get(`/api/appuntamenti/${id}/foto/${fotoId}`, { responseType: 'blob' }));
    return URL.createObjectURL(blob);
  }
}
