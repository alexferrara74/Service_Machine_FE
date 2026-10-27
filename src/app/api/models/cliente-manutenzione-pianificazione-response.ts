import { ClienteManutenzionePeriodoResponse } from './cliente-manutenzione-periodo-response';

export interface ClienteManutenzionePianificazioneResponse {
  clienteId: number;
  giorniAvviso: number;
  periodi: ClienteManutenzionePeriodoResponse[];
}
