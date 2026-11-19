import { AppuntamentoResponse } from '../api/models/appuntamento-response';

export type StatoAppuntamento = NonNullable<AppuntamentoResponse['stato']>;

/**
 * Stati di un appuntamento di assistenza. Il colore (token --st-* in styles.css) non è l'unico segnale:
 * ogni stato ha anche un simbolo, così il calendario si legge anche in bianco e nero o da chi non distingue i colori.
 */
export const STATI_APPUNTAMENTO: ReadonlyArray<{ value: StatoAppuntamento; label: string; symbol: string; css: string }> = [
  { value: 'DA_CONFERMARE', label: 'Da confermare', symbol: '?', css: 'st-da-confermare' },
  { value: 'DA_FARE', label: 'Da fare', symbol: '●', css: 'st-da-fare' },
  { value: 'FATTO', label: 'Fatto', symbol: '✓', css: 'st-fatto' },
  { value: 'ANNULLATO', label: 'Annullato', symbol: '✕', css: 'st-annullato' }
];

export function statoAppuntamento(stato?: string | null) {
  return STATI_APPUNTAMENTO.find(s => s.value === stato) ?? STATI_APPUNTAMENTO[0];
}
