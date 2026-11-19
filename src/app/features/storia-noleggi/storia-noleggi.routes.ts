import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth.guard';

export const STORIA_NOLEGGI_ROUTES: Routes = [
  { path: 'new', canActivate: [adminGuard], loadComponent: () => import('./storia-noleggi-detail.component').then(c => c.StoriaNoleggioDetailComponent) },
  { path: ':id', loadComponent: () => import('./storia-noleggi-detail.component').then(c => c.StoriaNoleggioDetailComponent) },
  { path: '', loadComponent: () => import('./storia-noleggi-list.component').then(c => c.StoriaNoleggioListComponent) }
];
