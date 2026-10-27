import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../api-configuration';
import { NoleggioManutenzionePianificazioneRequest } from '../models/noleggio-manutenzione-pianificazione-request';
import { ClienteManutenzionePianificazioneResponse } from '../models/cliente-manutenzione-pianificazione-response';

@Injectable({ providedIn: 'root' })
export class ClienteManutenzioneService {
  private readonly baseUrl: string;

  constructor(config: ApiConfiguration, private http: HttpClient) {
    this.baseUrl = `${config.rootUrl.replace(/\/$/, '')}/api/clienti`;
  }

  async getPianificazione(clienteId: number): Promise<ClienteManutenzionePianificazioneResponse | null> {
    try {
      return await firstValueFrom(this.http.get<ClienteManutenzionePianificazioneResponse>(
        `${this.baseUrl}/${clienteId}/manutenzione/pianificazione`
      ));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) return null;
      throw error;
    }
  }

  configuraPianificazione(
    clienteId: number,
    body: NoleggioManutenzionePianificazioneRequest
  ): Promise<ClienteManutenzionePianificazioneResponse> {
    return firstValueFrom(this.http.put<ClienteManutenzionePianificazioneResponse>(
      `${this.baseUrl}/${clienteId}/manutenzione/pianificazione`,
      body
    ));
  }
}
