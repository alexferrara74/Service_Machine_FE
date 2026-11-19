import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth.guard';

export const STORIA_PRODOTTI_ROUTES: Routes = [
  { path: 'new', canActivate: [adminGuard], loadComponent: () => import('./storia-prodotti-page.component').then(c => c.StoriaProdottiPageComponent) },
  { path: ':id', loadComponent: () => import('./storia-prodotti-page.component').then(c => c.StoriaProdottiPageComponent) },
  { path: '', loadComponent: () => import('./storia-prodotti-page.component').then(c => c.StoriaProdottiPageComponent) }
];
