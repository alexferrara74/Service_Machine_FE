import { HttpErrorResponse } from '@angular/common/http';

/** Testo da mostrare all'utente: il messaggio del backend se presente, altrimenti quello di riserva. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const backendMessage = error.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) return backendMessage;
    return error.status === 0 ? 'Server non raggiungibile' : fallback;
  }
  return (error as { message?: string } | null)?.message ?? fallback;
}
