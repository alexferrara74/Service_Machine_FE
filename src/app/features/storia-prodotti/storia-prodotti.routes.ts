import { Routes } from '@angular/router';

export const STORIA_PRODOTTI_ROUTES: Routes = [
  { path: 'new', loadComponent: () => import('./storia-prodotti-page.component').then(c => c.StoriaProdottiPageComponent) },
  { path: ':id', loadComponent: () => import('./storia-prodotti-page.component').then(c => c.StoriaProdottiPageComponent) },
  { path: '', loadComponent: () => import('./storia-prodotti-page.component').then(c => c.StoriaProdottiPageComponent) }
];
