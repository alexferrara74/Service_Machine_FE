export interface ProdottoCatalogo {
  articoloId: number;
  codice: string;
  descrizione: string;
  categoriaId?: number;
  categoriaDescrizione?: string;
  classeCodice?: string;
  sottoclasseCodice?: string;
  isAttrezzatura: boolean;
  isAccessorio?: boolean;
  /** ERP = importato dal sync, MANUALE = creato dall'operatore. */
  origine?: string;
  aggiornatoIl?: string;
}
