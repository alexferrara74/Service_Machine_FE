export interface NoleggioManutenzioneEventoResponse {
  id: number;
  docId: number;
  tipo: string;
  quantitaAcquistataTotale: number;
  eseguitaIl: string;
  note?: string | null;
  esito?: string | null;
  giorniProrogaOrdinaria?: number | null;
  giorniProrogaStraordinaria?: number | null;
  appuntamentoId?: number | null;
}
