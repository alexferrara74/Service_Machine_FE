import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProdottoCatalogo } from './prodotto-catalogo';

@Injectable({ providedIn: 'root' })
export class CatalogoProdottiService {
  constructor(private http: HttpClient) {}

  getAll(): Promise<ProdottoCatalogo[]> {
    return firstValueFrom(this.http.get<ProdottoCatalogo[]>('/api/prodotti/catalogo'));
  }

  /** Registra a mano un articolo (attrezzatura) che il catalogo ERP non contiene. */
  create(body: { codice: string; descrizione: string; isAttrezzatura?: boolean }): Promise<ProdottoCatalogo> {
    return firstValueFrom(this.http.post<ProdottoCatalogo>('/api/prodotti/catalogo', body));
  }

  getAttrezzature(): Promise<ProdottoCatalogo[]> {
    return firstValueFrom(this.http.get<ProdottoCatalogo[]>('/api/prodotti/catalogo', {
      params: { attrezzatura: true }
    }));
  }
}
