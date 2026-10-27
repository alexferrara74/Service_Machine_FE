import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Servizi Pilot';

  navItems = [
    { path: '/attrezzature', label: '🔧 Attrezzature' },
    { path: '/clienti', label: '👥 Clienti' },
    { path: '/noleggi', label: '📋 Noleggi' },
    { path: '/prodotti', label: '📦 Prodotti' },
    { path: '/interventi', label: '🛠️ Interventi' },
    { path: '/magazzino', label: '🏭 Magazzino' },
    { path: '/magazzino-posizioni', label: '📍 Posizioni Magazzino' },
    { path: '/sync', label: '🔄 Sincronizzazione' },
  ];
}
