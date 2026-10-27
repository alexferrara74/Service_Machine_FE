export interface NoleggioManutenzionePeriodoRequest {
  dataInizio: string;
  dataFine: string;
  intervalloGiorni: number;
}

export interface NoleggioManutenzionePianificazioneRequest {
  giorniAvviso: number;
  periodi: NoleggioManutenzionePeriodoRequest[];
}
