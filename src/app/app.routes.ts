import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login-page.component').then(m => m.LoginPageComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'attrezzature', pathMatch: 'full' },
      { path: 'attrezzature', loadChildren: () => import('./features/attrezzature/attrezzature.routes').then(m => m.ATTREZZATURE_ROUTES) },
      { path: 'clienti', loadChildren: () => import('./features/clienti/clienti.routes').then(m => m.CLIENTI_ROUTES) },
      { path: 'noleggi', loadChildren: () => import('./features/storia-noleggi/storia-noleggi.routes').then(m => m.STORIA_NOLEGGI_ROUTES) },
      { path: 'prodotti', loadChildren: () => import('./features/storia-prodotti/storia-prodotti.routes').then(m => m.STORIA_PRODOTTI_ROUTES) },
      { path: 'catalogo-prodotti', loadComponent: () => import('./features/catalogo/catalogo-prodotti-page.component').then(m => m.CatalogoProdottiPageComponent) },
      { path: 'storia-noleggi', redirectTo: 'noleggi' },
      { path: 'storia-prodotti', redirectTo: 'prodotti' },
      { path: 'interventi', loadChildren: () => import('./features/interventi/interventi.routes').then(m => m.INTERVENTI_ROUTES) },
      { path: 'appuntamenti', loadChildren: () => import('./features/appuntamenti/appuntamenti.routes').then(m => m.APPUNTAMENTI_ROUTES) },
      { path: 'calendario', loadComponent: () => import('./features/calendario/calendario-page.component').then(m => m.CalendarioPageComponent) },
      { path: 'magazzino', loadChildren: () => import('./features/magazzino/magazzino.routes').then(m => m.MAGAZZINO_ROUTES) },
      { path: 'magazzino-posizioni', loadChildren: () => import('./features/magazzino-posizioni/magazzino-posizioni.routes').then(m => m.MAGAZZINO_POSIZIONI_ROUTES) },
      { path: 'magazzino-3d', loadComponent: () => import('./features/scaffali/magazzino-3d-page.component').then(m => m.Magazzino3dPageComponent) },
      { path: 'scaffali', loadChildren: () => import('./features/scaffali/scaffali.routes').then(m => m.SCAFFALI_ROUTES) },
      { path: 'sync', canActivate: [adminGuard], loadComponent: () => import('./features/sync/sync-page.component').then(m => m.SyncPageComponent) },
      { path: 'utenti', canActivate: [adminGuard], loadComponent: () => import('./features/utenti/utenti-page.component').then(m => m.UtentiPageComponent) },
      { path: 'registro', canActivate: [adminGuard], loadComponent: () => import('./features/registro/registro-page.component').then(m => m.RegistroPageComponent) },
      { path: 'account', loadComponent: () => import('./features/account/account-page.component').then(m => m.AccountPageComponent) }
    ]
  },
  { path: '**', redirectTo: 'attrezzature' }
];
