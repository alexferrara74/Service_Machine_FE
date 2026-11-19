import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Servizi Pilot';

  auth = inject(AuthService);

  private readonly allNavGroups: { label: string; items: { path: string; label: string; adminOnly?: boolean }[] }[] = [
    { label: 'Parco macchine', items: [
      { path: '/attrezzature', label: 'Attrezzature' },
      { path: '/noleggi', label: 'Noleggi' },
      { path: '/interventi', label: 'Interventi' },
      { path: '/calendario', label: 'Calendario assistenze' },
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
      { path: '/sync', label: 'Sincronizzazione ERP', adminOnly: true },
      { path: '/utenti', label: 'Utenti', adminOnly: true },
    ] },
  ];

  /**
   * Le voci di amministrazione compaiono solo agli admin (le pagine sono comunque protette dal guard e dal backend).
   * È un computed: restituire array nuovi a ogni controllo farebbe ricreare i link a ogni ciclo di rilevamento.
   */
  readonly navGroups = computed(() => {
    const admin = this.auth.isAdmin();
    return this.allNavGroups
      .map(g => ({ label: g.label, items: g.items.filter(i => admin || !i.adminOnly) }))
      .filter(g => g.items.length);
  });

  readonly navItems = computed(() => this.navGroups().flatMap(group => group.items));
}
