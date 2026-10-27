export interface NoleggioManutenzioneResponse {
  docId: number;
  clienteId: number;
  cliente: string;
  articoloId?: number;
  matricola?: string;
  quantitaNoleggiata?: number;
  configurata: boolean;
  sogliaQuantita?: number | null;
  ordinariePerStraordinaria?: number | null;
  categoriaIds: number[];
  quantitaAcquistataTotale: number;
  quantitaDopoUltimaManutenzione: number;
  quantitaResidua?: number | null;
  manutenzioniOrdinarieDallUltimaStraordinaria: number;
  manutenzioneDovuta: boolean;
  tipoManutenzioneDovuta?: string | null;
  ultimaManutenzioneIl?: string | null;
  pianificazioneConfigurata: boolean;
  prossimaManutenzioneIl?: string | null;
  giorniAllaManutenzione?: number | null;
  statoManutenzione: 'NON_CONFIGURATA' | 'PROGRAMMATA' | 'IN_SCADENZA' | 'IN_RITARDO';
  intervalloManutenzioneGiorni?: number | null;
}
