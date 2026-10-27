import { Routes } from '@angular/router';

export const INTERVENTI_ROUTES: Routes = [
  { path: 'new', loadComponent: () => import('./interventi-page.component').then(c => c.InterventiPageComponent) },
  { path: ':id', loadComponent: () => import('./interventi-page.component').then(c => c.InterventiPageComponent) },
  { path: '', loadComponent: () => import('./interventi-page.component').then(c => c.InterventiPageComponent) }
];
