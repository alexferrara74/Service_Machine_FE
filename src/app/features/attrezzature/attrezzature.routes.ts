import { Routes } from '@angular/router';

export const ATTREZZATURE_ROUTES: Routes = [
  { path: 'new', loadComponent: () => import('./attrezzature-detail.component').then(c => c.AttrezzatureDetailComponent) },
  { path: ':id', loadComponent: () => import('./attrezzature-detail.component').then(c => c.AttrezzatureDetailComponent) },
  { path: '', loadComponent: () => import('./attrezzature-list.component').then(c => c.AttrezzatureListComponent) }
];
