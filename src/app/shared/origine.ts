/** Anagrafiche importate dall'ERP o create a mano dall'operatore (cliente, articolo, attrezzatura). */
export type Origine = 'ERP' | 'MANUALE';

export const ORIGINE_MANUALE: Origine = 'MANUALE';

export function isManuale(item: { origine?: string | null }): boolean {
  return item.origine?.toUpperCase() === ORIGINE_MANUALE;
}
