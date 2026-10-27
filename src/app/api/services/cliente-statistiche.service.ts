import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../api-configuration';
import { ClienteStatisticheResponse } from '../models/cliente-statistiche-response';

@Injectable({ providedIn: 'root' })
export class ClienteStatisticheService {
  private readonly baseUrl: string;

  constructor(config: ApiConfiguration, private http: HttpClient) {
    this.baseUrl = `${config.rootUrl.replace(/\/$/, '')}/api/statistiche/clienti`;
  }

  getStatistiche(clienteId: number, dal?: string, al?: string): Promise<ClienteStatisticheResponse> {
    let params = new HttpParams();
    if (dal) params = params.set('dal', dal);
    if (al) params = params.set('al', al);
    return firstValueFrom(this.http.get<ClienteStatisticheResponse>(
      `${this.baseUrl}/${clienteId}`,
      { params }
    ));
  }
}
