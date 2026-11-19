import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth.guard';

export const CLIENTI_ROUTES: Routes = [
  { path: 'new', canActivate: [adminGuard], loadComponent: () => import('./clienti-detail.component').then(c => c.ClientiDetailComponent) },
  { path: ':id', loadComponent: () => import('./clienti-detail.component').then(c => c.ClientiDetailComponent) },
  { path: '', loadComponent: () => import('./clienti-list.component').then(c => c.ClientiListComponent) }
];
