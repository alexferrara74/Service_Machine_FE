import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'attrezzature', pathMatch: 'full' },
  { path: 'attrezzature', loadChildren: () => import('./features/attrezzature/attrezzature.routes').then(m => m.ATTREZZATURE_ROUTES) },
  { path: 'clienti', loadChildren: () => import('./features/clienti/clienti.routes').then(m => m.CLIENTI_ROUTES) },
  { path: 'noleggi', loadChildren: () => import('./features/storia-noleggi/storia-noleggi.routes').then(m => m.STORIA_NOLEGGI_ROUTES) },
  { path: 'prodotti', loadChildren: () => import('./features/storia-prodotti/storia-prodotti.routes').then(m => m.STORIA_PRODOTTI_ROUTES) },
  { path: 'catalogo-prodotti', loadComponent: () => import('./features/catalogo/catalogo-prodotti-page.component').then(m => m.CatalogoProdottiPageComponent) },
  { path: 'storia-noleggi', redirectTo: 'noleggi' },
  { path: 'storia-prodotti', redirectTo: 'prodotti' },
  { path: 'interventi', loadChildren: () => import('./features/interventi/interventi.routes').then(m => m.INTERVENTI_ROUTES) },
  { path: 'magazzino', loadChildren: () => import('./features/magazzino/magazzino.routes').then(m => m.MAGAZZINO_ROUTES) },
  { path: 'magazzino-posizioni', loadChildren: () => import('./features/magazzino-posizioni/magazzino-posizioni.routes').then(m => m.MAGAZZINO_POSIZIONI_ROUTES) },
  { path: 'sync', loadComponent: () => import('./features/sync/sync-page.component').then(m => m.SyncPageComponent) },
  { path: '**', redirectTo: 'attrezzature' }
];
