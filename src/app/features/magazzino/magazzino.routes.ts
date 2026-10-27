import { Routes } from '@angular/router';

export const MAGAZZINO_ROUTES: Routes = [
  { path: 'new', loadComponent: () => import('./magazzino-page.component').then(c => c.MagazzinoPageComponent) },
  { path: ':id', loadComponent: () => import('./magazzino-page.component').then(c => c.MagazzinoPageComponent) },
  { path: '', loadComponent: () => import('./magazzino-page.component').then(c => c.MagazzinoPageComponent) }
];
