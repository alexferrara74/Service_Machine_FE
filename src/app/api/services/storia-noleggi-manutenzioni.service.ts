import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../api-configuration';
import { NoleggioManutenzioneConfigurazioneRequest } from '../models/noleggio-manutenzione-configurazione-request';
import { NoleggioManutenzioneEventoResponse } from '../models/noleggio-manutenzione-evento-response';
import { NoleggioManutenzioneResponse } from '../models/noleggio-manutenzione-response';

@Injectable({ providedIn: 'root' })
export class StoriaNoleggiManutenzioniService {
  private readonly baseUrl: string;

  constructor(config: ApiConfiguration, private http: HttpClient) {
    this.baseUrl = `${config.rootUrl}/api/storia/noleggi`;
  }

  getStato(docId: number): Promise<NoleggioManutenzioneResponse> {
    return firstValueFrom(this.http.get<NoleggioManutenzioneResponse>(`${this.baseUrl}/${docId}/manutenzione`));
  }

  configura(docId: number, body: NoleggioManutenzioneConfigurazioneRequest): Promise<NoleggioManutenzioneResponse> {
    return firstValueFrom(this.http.put<NoleggioManutenzioneResponse>(
      `${this.baseUrl}/${docId}/manutenzione/configurazione`,
      body
    ));
  }

  getEventi(docId: number): Promise<NoleggioManutenzioneEventoResponse[]> {
    return firstValueFrom(this.http.get<NoleggioManutenzioneEventoResponse[]>(
      `${this.baseUrl}/${docId}/manutenzione/eventi`
    ));
  }

  registraManutenzione(docId: number, note = ''): Promise<NoleggioManutenzioneEventoResponse> {
    return firstValueFrom(this.http.post<NoleggioManutenzioneEventoResponse>(
      `${this.baseUrl}/${docId}/manutenzione/eventi`,
      { note }
    ));
  }

  registraStraordinaria(docId: number, note = ''): Promise<NoleggioManutenzioneEventoResponse> {
    return firstValueFrom(this.http.post<NoleggioManutenzioneEventoResponse>(
      `${this.baseUrl}/${docId}/manutenzione/eventi/straordinaria`,
      { note }
    ));
  }
}
