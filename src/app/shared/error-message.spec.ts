import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it('uses the message sent by the backend', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { status: 409, error: 'CONFLICT', message: 'Il cliente non può essere eliminato' },
    });
    expect(errorMessage(error, 'Errore nell\'eliminazione')).toBe('Il cliente non può essere eliminato');
  });

  it('falls back when the backend sends no message', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 500, error: 'boom' }), 'Errore generico')).toBe('Errore generico');
  });

  it('reports an unreachable server', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }), 'Errore generico')).toBe('Server non raggiungibile');
  });

  it('keeps the message of non-HTTP errors and falls back for empty ones', () => {
    expect(errorMessage(new Error('locale'), 'Errore generico')).toBe('locale');
    expect(errorMessage(undefined, 'Errore generico')).toBe('Errore generico');
  });
});
