import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface DocumentoNoleggio {
  nomeFile: string;
  aggiornatoIl?: string;
}

@Injectable({ providedIn: 'root' })
export class NoleggioDocumentoService {
  constructor(private http: HttpClient) {}

  getMetadata(docId: number): Promise<DocumentoNoleggio> {
    return firstValueFrom(this.http.get<DocumentoNoleggio>(this.url(docId)));
  }

  upload(docId: number, file: File): Promise<DocumentoNoleggio> {
    const form = new FormData();
    form.append('file', file, file.name);
    return firstValueFrom(this.http.post<DocumentoNoleggio>(this.url(docId), form));
  }

  download(docId: number): Promise<HttpResponse<Blob>> {
    return firstValueFrom(this.http.get(this.url(docId) + '/download', {
      observe: 'response',
      responseType: 'blob'
    }));
  }

  private url(docId: number): string {
    return `/api/storia/noleggi/${docId}/documento`;
  }
}
