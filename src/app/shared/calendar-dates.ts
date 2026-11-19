/**
 * Date del calendario sempre come testo locale (yyyy-MM-ddTHH:mm): niente toISOString(), che converte in UTC
 * e sposterebbe di un giorno gli appuntamenti vicino alla mezzanotte. Il backend li legge come LocalDateTime.
 */
const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalDateTime(d: Date): string {
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Parsing locale di "yyyy-MM-ddTHH:mm[:ss]" (new Date(string) lo leggerebbe come UTC se avesse la "Z"). */
export function parseLocal(s: string): Date {
  const [datePart, timePart = '00:00'] = s.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm || 0, 0, 0);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Lunedì della settimana che contiene la data (in Italia la settimana parte dal lunedì). */
export function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7;
  return addDays(startOfDay(d), -offset);
}

export function timeOf(s?: string): string {
  return s ? s.slice(11, 16) : '';
}
