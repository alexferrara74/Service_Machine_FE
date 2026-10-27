import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../api-configuration';
import { PageResponse } from '../models/page-response';
import { StoriaNoleggioResponse } from '../models/storia-noleggio-response';

@Injectable({ providedIn: 'root' })
export class StoriaNoleggiPaginatiService {
  private readonly baseUrl: string;

  constructor(config: ApiConfiguration, private http: HttpClient) {
    this.baseUrl = `${config.rootUrl.replace(/\/$/, '')}/api/storia/noleggi`;
  }

  getPage(page: number, size: number): Promise<PageResponse<StoriaNoleggioResponse>> {
    return this.request(`${this.baseUrl}/pagina`, page, size);
  }

  getPageByCliente(clienteId: number, page: number, size: number): Promise<PageResponse<StoriaNoleggioResponse>> {
    return this.request(`${this.baseUrl}/cliente/${clienteId}/pagina`, page, size);
  }

  getPageByArticolo(articoloId: number, page: number, size: number): Promise<PageResponse<StoriaNoleggioResponse>> {
    return this.request(`${this.baseUrl}/articolo/${articoloId}/pagina`, page, size);
  }

  getPageByMatricola(matricola: string, page: number, size: number): Promise<PageResponse<StoriaNoleggioResponse>> {
    return this.request(`${this.baseUrl}/matricola/${encodeURIComponent(matricola)}/pagina`, page, size);
  }

  private request(url: string, page: number, size: number): Promise<PageResponse<StoriaNoleggioResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return firstValueFrom(this.http.get<PageResponse<StoriaNoleggioResponse>>(url, { params }));
  }
}
