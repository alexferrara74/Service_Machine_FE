import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Aggiunge il token alle chiamate /api e, se il server risponde 401, riporta al login. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApi = req.url.includes('/api/');
  const isLogin = req.url.endsWith('/api/auth/login');
  const token = isApi && !isLogin ? auth.token : null;
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      // 401 su una chiamata con token = sessione scaduta o utente disattivato; sul login è solo "credenziali errate".
      // Se la sessione è già stata chiusa (uscita volontaria) un 401 in ritardo non deve riaprire il login con un redirect.
      if (error instanceof HttpErrorResponse && error.status === 401 && isApi && !isLogin && auth.sessione()) {
        auth.logout(router.url);
      }
      return throwError(() => error);
    })
  );
};
