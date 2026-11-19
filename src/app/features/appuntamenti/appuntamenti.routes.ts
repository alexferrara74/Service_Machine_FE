import { Routes } from '@angular/router';

export const APPUNTAMENTI_ROUTES: Routes = [
  { path: ':docId/new', loadComponent: () => import('./appuntamento-detail.component').then(c => c.AppuntamentoDetailComponent) },
  { path: ':docId/:id', loadComponent: () => import('./appuntamento-detail.component').then(c => c.AppuntamentoDetailComponent) },
  { path: '', loadComponent: () => import('./appuntamenti-page.component').then(c => c.AppuntamentiPageComponent) }
];
