export interface NoleggioManutenzioneEventoResponse {
  id: number;
  docId: number;
  tipo: string;
  quantitaAcquistataTotale: number;
  eseguitaIl: string;
  note?: string | null;
  esito?: string | null;
  giorniProroga?: number | null;
  appuntamentoId?: number | null;
}
