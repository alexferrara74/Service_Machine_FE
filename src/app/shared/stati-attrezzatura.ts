/** Stati ammessi dal backend (valore) con l'etichetta mostrata all'utente. */
export const STATI_ATTREZZATURA = [
  { value: 'DISPONIBILE', label: 'Disponibile' },
  { value: 'IN_USO', label: 'Noleggiata' },
  { value: 'IN_MANUTENZIONE', label: 'In manutenzione' }
] as const;

export function statoLabel(stato?: string | null): string {
  return STATI_ATTREZZATURA.find(s => s.value === stato?.toUpperCase())?.label ?? stato ?? '';
}
