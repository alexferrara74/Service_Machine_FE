import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiConfiguration } from '../api/api-configuration';
import { AuthService, Ruolo, Sessione } from './auth.service';
import { adminGuard, authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';

const KEY = 'servizi-pilot.sessione';
const futura = () => new Date(Date.now() + 3600_000).toISOString();
const sessione = (ruolo: Ruolo, scadenza = futura()): Sessione => ({ token: 'tok', username: 'u', ruolo, scadenza });

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: ApiConfiguration, useValue: { rootUrl: '' } },
    ],
  });
  return {
    auth: TestBed.inject(AuthService),
    router: TestBed.inject(Router),
    http: TestBed.inject(HttpClient),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

describe('autenticazione', () => {
  beforeEach(() => localStorage.clear());

  it('restores a valid stored session and ignores an expired one', () => {
    localStorage.setItem(KEY, JSON.stringify(sessione('ADMIN')));
    expect(setup().auth.isAdmin()).toBeTrue();

    TestBed.resetTestingModule();
    localStorage.setItem(KEY, JSON.stringify(sessione('ADMIN', new Date(Date.now() - 1000).toISOString())));
    expect(setup().auth.autenticato).toBeFalse();
  });

  it('tells admins from viewers', () => {
    const { auth } = setup();
    auth.sessione.set(sessione('VIEWER'));
    expect(auth.isAdmin()).toBeFalse();
    expect(auth.isViewer()).toBeTrue();
  });

  it('sends the visitor to the login with the page they asked for', () => {
    const { router } = setup();
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/clienti' } as never));
    expect(router.serializeUrl(result as never)).toBe('/login?redirect=%2Fclienti');
  });

  it('keeps a viewer out of admin pages but lets an admin in', () => {
    const { auth, router } = setup();
    auth.sessione.set(sessione('VIEWER'));
    const denied = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(router.serializeUrl(denied as never)).toBe('/');

    auth.sessione.set(sessione('ADMIN'));
    expect(TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never))).toBeTrue();
  });

  it('adds the token to API calls but not to the login', () => {
    const { auth, http, ctrl } = setup();
    auth.sessione.set(sessione('ADMIN'));

    http.get('/api/clienti').subscribe();
    expect(ctrl.expectOne('/api/clienti').request.headers.get('Authorization')).toBe('Bearer tok');

    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    expect(ctrl.expectOne('/api/auth/login').request.headers.has('Authorization')).toBeFalse();
  });

  it('logs out when the server rejects the token', () => {
    const { auth, http, ctrl } = setup();
    auth.sessione.set(sessione('ADMIN'));

    http.get('/api/clienti').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/clienti').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.autenticato).toBeFalse();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
