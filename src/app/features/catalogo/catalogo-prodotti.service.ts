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

  getAttrezzature(): Promise<ProdottoCatalogo[]> {
    return firstValueFrom(this.http.get<ProdottoCatalogo[]>('/api/prodotti/catalogo', {
      params: { attrezzatura: true }
    }));
  }
}
