/** Codice proposto per l'articolo di una matricola (es. "M-1001" -> "ATT-M-1001"); se esiste già si aggiunge un numero. */
export function proponiCodiceArticolo(matricola: string, esistenti: Iterable<string>): string {
  const base = ('ATT-' + (matricola ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '')).slice(0, 46);
  const usati = new Set([...esistenti].map(c => c.toUpperCase()));
  let codice = base;
  for (let n = 2; usati.has(codice); n++) codice = `${base}-${n}`;
  return codice;
}
