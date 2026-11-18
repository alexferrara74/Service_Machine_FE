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

  navGroups = [
    { label: 'Parco macchine', items: [
      { path: '/attrezzature', label: 'Attrezzature' },
      { path: '/noleggi', label: 'Noleggi' },
      { path: '/interventi', label: 'Interventi' },
    ] },
    { label: 'Anagrafiche', items: [
      { path: '/clienti', label: 'Clienti' },
      { path: '/prodotti', label: 'Prodotti' },
      { path: '/catalogo-prodotti', label: 'Catalogo ERP' },
    ] },
    { label: 'Magazzino', items: [
      { path: '/magazzino', label: 'Ubicazioni' },
      { path: '/magazzino-posizioni', label: 'Posizioni articoli' },
    ] },
    { label: 'Sistema', items: [
      { path: '/sync', label: 'Sincronizzazione ERP' },
    ] },
  ];

  navItems = this.navGroups.flatMap(group => group.items);
}
