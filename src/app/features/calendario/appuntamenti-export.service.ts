import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { addDays, dayKey, startOfDay, startOfWeek, toLocalDateTime } from '../../shared/calendar-dates';
import { StatoAppuntamento } from '../../shared/stati-appuntamento';

export type PeriodoExport = 'giorno' | 'settimana' | 'mese';
export type FormatoExport = 'xlsx' | 'pdf';

/** Scarica il calendario di un giorno, una settimana o un mese in Excel o PDF (generati dal backend). */
@Injectable({ providedIn: 'root' })
export class AppuntamentiExportService {
  constructor(private http: HttpClient, private config: ApiConfiguration) {}

  /** Intervallo [start, end) del periodo che contiene la data. */
  intervallo(periodo: PeriodoExport, giorno: Date): { start: Date; end: Date } {
    if (periodo === 'giorno') {
      const start = startOfDay(giorno);
      return { start, end: addDays(start, 1) };
    }
    if (periodo === 'settimana') {
      const start = startOfWeek(giorno);
      return { start, end: addDays(start, 7) };
    }
    return {
      start: new Date(giorno.getFullYear(), giorno.getMonth(), 1),
      end: new Date(giorno.getFullYear(), giorno.getMonth() + 1, 1)
    };
  }

  async scarica(periodo: PeriodoExport, giorno: Date, formato: FormatoExport, stati?: StatoAppuntamento[]): Promise<void> {
    const { start, end } = this.intervallo(periodo, giorno);
    let params = new HttpParams()
      .set('da', toLocalDateTime(start))
      .set('a', toLocalDateTime(end))
      .set('formato', formato);
    // Senza il parametro il backend esporta tutti gli stati.
    if (stati?.length) params = params.set('stati', stati.join(','));

    let blob: Blob;
    try {
      blob = await firstValueFrom(this.http.get(`${this.config.rootUrl}/api/appuntamenti/export`, { params, responseType: 'blob' }));
    } catch (error) {
      throw new Error(await this.messaggio(error));
    }
    const nome = `assistenze_${dayKey(start)}_${dayKey(addDays(end, -1))}.${formato}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Con responseType blob anche il corpo dell'errore è un Blob: lo si legge per mostrare il messaggio del backend. */
  private async messaggio(error: unknown): Promise<string> {
    const fallback = 'Errore nella generazione del file';
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return 'Server non raggiungibile';
    try {
      const text = error.error instanceof Blob ? await error.error.text() : '';
      const message = JSON.parse(text)?.message;
      return typeof message === 'string' && message.trim() ? message : fallback;
    } catch {
      return fallback;
    }
  }
}
