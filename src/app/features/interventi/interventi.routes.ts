import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth.guard';

export const INTERVENTI_ROUTES: Routes = [
  { path: 'new', canActivate: [adminGuard], loadComponent: () => import('./interventi-page.component').then(c => c.InterventiPageComponent) },
  { path: ':id', loadComponent: () => import('./interventi-page.component').then(c => c.InterventiPageComponent) },
  { path: '', loadComponent: () => import('./interventi-page.component').then(c => c.InterventiPageComponent) }
];
