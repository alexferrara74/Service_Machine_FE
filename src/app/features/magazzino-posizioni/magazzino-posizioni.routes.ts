import { Routes } from '@angular/router';

export const MAGAZZINO_POSIZIONI_ROUTES: Routes = [
  { path: 'new', loadComponent: () => import('./magazzino-posizioni-page.component').then(c => c.MagazzinoPosizioniPageComponent) },
  { path: ':id', loadComponent: () => import('./magazzino-posizioni-page.component').then(c => c.MagazzinoPosizioniPageComponent) },
  { path: '', loadComponent: () => import('./magazzino-posizioni-page.component').then(c => c.MagazzinoPosizioniPageComponent) }
];
