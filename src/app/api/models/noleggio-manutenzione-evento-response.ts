export interface NoleggioManutenzioneEventoResponse {
  id: number;
  docId: number;
  tipo: string;
  quantitaAcquistataTotale: number;
  eseguitaIl: string;
  note?: string | null;
}
