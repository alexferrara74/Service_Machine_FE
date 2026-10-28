export interface ProdottoCatalogo {
  articoloId: number;
  codice: string;
  descrizione: string;
  categoriaId?: number;
  categoriaDescrizione?: string;
  classeCodice?: string;
  sottoclasseCodice?: string;
  isAttrezzatura: boolean;
  aggiornatoIl?: string;
}
