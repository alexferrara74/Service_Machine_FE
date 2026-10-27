import { Routes } from '@angular/router';

export const CLIENTI_ROUTES: Routes = [
  { path: 'new', loadComponent: () => import('./clienti-detail.component').then(c => c.ClientiDetailComponent) },
  { path: ':id', loadComponent: () => import('./clienti-detail.component').then(c => c.ClientiDetailComponent) },
  { path: '', loadComponent: () => import('./clienti-list.component').then(c => c.ClientiListComponent) }
];
