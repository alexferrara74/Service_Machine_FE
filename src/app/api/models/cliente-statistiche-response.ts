export interface CategoriaVenditeStatisticheResponse {
  categoriaId?: number | null;
  categoria?: string | null;
  quantitaTotale: number;
  righeVendita: number;
}

export interface ProdottoVenditeStatisticheResponse {
  articoloId?: number | null;
  codiceArticolo?: string | null;
  descrizione?: string | null;
  categoriaId?: number | null;
  categoria?: string | null;
  quantitaTotale: number;
  righeVendita: number;
}

export interface VenditeMensiliStatisticheResponse {
  anno: number;
  mese: number;
  quantitaTotale: number;
  righeVendita: number;
}

export interface NoleggioVenditeStimateResponse {
  docId: number;
  articoloIdAttrezzatura?: number | null;
  matricola?: string | null;
  quantitaNoleggiata?: number | null;
  categorieProdottoStimate: CategoriaVenditeStatisticheResponse[];
  prodottiAcquistatiStimati: ProdottoVenditeStatisticheResponse[];
  ambitoStima: string;
}

export interface ClienteStatisticheResponse {
  clienteId: number;
  cliente: string;
  dal?: string | null;
  al?: string | null;
  quantitaTotaleAcquistata: number;
  righeVendita: number;
  noleggiEStimePerAttrezzatura: NoleggioVenditeStimateResponse[];
  venditePerCategoria: CategoriaVenditeStatisticheResponse[];
  venditePerProdotto: ProdottoVenditeStatisticheResponse[];
  andamentoMensile: VenditeMensiliStatisticheResponse[];
}
