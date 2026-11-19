import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth.guard';

export const MAGAZZINO_ROUTES: Routes = [
  { path: 'new', canActivate: [adminGuard], loadComponent: () => import('./magazzino-page.component').then(c => c.MagazzinoPageComponent) },
  { path: ':id', loadComponent: () => import('./magazzino-page.component').then(c => c.MagazzinoPageComponent) },
  { path: '', loadComponent: () => import('./magazzino-page.component').then(c => c.MagazzinoPageComponent) }
];
