import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Serve il login per tutto tranne /login. Sul server (SSR) non c'è sessione da verificare: decide il browser. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (isPlatformServer(inject(PLATFORM_ID))) return true;
  const auth = inject(AuthService);
  if (auth.autenticato) return true;
  return inject(Router).createUrlTree(['/login'], state.url && state.url !== '/' ? { queryParams: { redirect: state.url } } : {});
};

/** Pagine di modifica e amministrazione: un viewer torna alla home. */
export const adminGuard: CanActivateFn = () => {
  if (isPlatformServer(inject(PLATFORM_ID))) return true;
  return inject(AuthService).isAdmin() || inject(Router).createUrlTree(['/']);
};
