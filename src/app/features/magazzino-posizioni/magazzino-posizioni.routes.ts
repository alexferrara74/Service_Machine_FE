import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth.guard';

export const MAGAZZINO_POSIZIONI_ROUTES: Routes = [
  { path: 'new', canActivate: [adminGuard], loadComponent: () => import('./magazzino-posizioni-page.component').then(c => c.MagazzinoPosizioniPageComponent) },
  { path: ':id', loadComponent: () => import('./magazzino-posizioni-page.component').then(c => c.MagazzinoPosizioniPageComponent) },
  { path: '', loadComponent: () => import('./magazzino-posizioni-page.component').then(c => c.MagazzinoPosizioniPageComponent) }
];
