import { Directive, HostBinding, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Nasconde un elemento (pulsante di creazione, salvataggio, eliminazione...) a chi non è amministratore.
 * È solo presentazione: il backend rifiuta comunque le scritture dei viewer con 403.
 * Non è strutturale, quindi convive con *ngIf sullo stesso elemento.
 */
@Directive({ selector: '[appAdmin]', standalone: true })
export class AdminOnlyDirective {
  private auth = inject(AuthService);

  @HostBinding('style.display') get display(): string | null {
    return this.auth.isAdmin() ? null : 'none';
  }
}
