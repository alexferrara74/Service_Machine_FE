import { RenderMode, ServerRoute } from '@angular/ssr';
import { AppComponent } from './app.component';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];

