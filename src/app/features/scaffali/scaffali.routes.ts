import { Routes } from '@angular/router';

export const SCAFFALI_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./scaffali-page.component').then(c => c.ScaffaliPageComponent) }
];
