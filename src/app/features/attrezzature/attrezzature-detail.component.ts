import { AuthService } from '../../core/auth.service';
import { AdminOnlyDirective } from '../../core/admin-only.directive';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AttrezzatureService } from '../../api/services/attrezzature.service';
import { AttrezzaturaResponse } from '../../api/models/attrezzatura-response';
import { AttrezzaturaRequest } from '../../api/models/attrezzatura-request';
import { errorMessage } from '../../shared/error-message';
import { STATI_ATTREZZATURA } from '../../shared/stati-attrezzatura';
import { CatalogoProdottiService } from '../catalogo/catalogo-prodotti.service';
import { ProdottoCatalogo } from '../catalogo/prodotto-catalogo';
import { proponiCodiceArticolo } from '../../shared/codice-articolo';
import { OpzioneRicerca, SelectRicercaComponent } from '../../shared/select-ricerca.component';


@Component({
  selector: 'app-attrezzature-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminOnlyDirective, SelectRicercaComponent],
  templateUrl: './attrezzature-detail.component.html',
  styleUrl: './attrezzature-detail.component.css'
})
export class AttrezzatureDetailComponent implements OnInit {
  readonly auth = inject(AuthService);
  isNew = false;
  loading = false;
  saving = false;
  error = '';
  id: number | null = null;

  form: AttrezzaturaRequest = {
    descrizione: '',
    marca: '',
    modello: '',
    matricola: '',
    stato: 'DISPONIBILE'
  };

  readonly statiOptions = STATI_ATTREZZATURA;

  // articolo del catalogo collegato alla matricola
  articoli: ProdottoCatalogo[] = [];
  opzioniArticoli: OpzioneRicerca[] = [];
  creaArticolo = false;
  codiceArticolo = '';
  codiceModificato = false;

  constructor(
    private service: AttrezzatureService,
    private catalogo: CatalogoProdottiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.id = !idParam || idParam === 'new' ? null : Number(idParam);
    await this.caricaArticoli();
    if (this.id === null) {
      this.isNew = true;
      this.creaArticolo = true; // una nuova matricola nasce con il suo articolo: senza non si potrebbe mettere in noleggio
      return;
    }
    this.loading = true;
    try {
      const data: AttrezzaturaResponse = await this.service.getById6({ id: this.id });
      this.form = {
        descrizione: data.descrizione ?? '',
        marca: data.marca ?? '',
        modello: data.modello ?? '',
        matricola: data.matricola ?? '',
        stato: data.stato ?? '',
        articoloId: data.articoloId
      };
    } catch (e: any) {
      this.error = errorMessage(e, 'Errore nel caricamento');
    } finally {
      this.loading = false;
    }
  }

  /** Articoli del catalogo che sono attrezzature e non già collegati a un'altra matricola (un articolo = una matricola). */
  private async caricaArticoli(): Promise<void> {
    try {
      const [articoli, attrezzature] = await Promise.all([this.catalogo.getAttrezzature(), this.service.getAll6()]);
      this.articoli = articoli;
      const occupati = new Set(attrezzature.filter(a => a.articoloId != null && a.id !== this.id).map(a => a.articoloId!));
      this.opzioniArticoli = articoli.filter(a => !occupati.has(a.articoloId))
        .map(a => ({ value: a.articoloId, label: `${a.codice} — ${a.descrizione}`, gruppo: a.origine === 'MANUALE' ? 'Creati a mano' : 'Catalogo ERP' }))
        .sort((x, y) => (x.gruppo === y.gruppo ? 0 : x.gruppo === 'Catalogo ERP' ? -1 : 1));
    } catch {
      this.opzioniArticoli = []; // il collegamento è facoltativo: senza elenco il modulo funziona comunque
    }
  }

  /** Finché il codice non è stato scritto a mano, segue la matricola (es. M-1001 -> ATT-M-1001). */
  onMatricola(matricola: string): void {
    if (this.creaArticolo && !this.codiceModificato) {
      this.codiceArticolo = matricola?.trim() ? proponiCodiceArticolo(matricola, this.articoli.map(a => a.codice)) : '';
    }
  }

  onCreaArticolo(): void {
    if (this.creaArticolo) { this.form.articoloId = undefined; this.onMatricola(this.form.matricola); }
  }

  onArticoloChange(articoloId: number | undefined): void {
    const articolo = this.articoli.find(a => a.articoloId === articoloId);
    if (articolo && !this.form.descrizione?.trim()) this.form.descrizione = articolo.descrizione;
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      if (this.creaArticolo) {
        if (!this.codiceArticolo.trim()) throw new Error('Il codice del nuovo articolo è obbligatorio.');
        if (!this.form.descrizione?.trim()) throw new Error('La descrizione è obbligatoria: diventa anche la descrizione del nuovo articolo.');
        const articolo = await this.catalogo.create({ codice: this.codiceArticolo.trim(), descrizione: this.form.descrizione.trim(), isAttrezzatura: true });
        // se la matricola poi non si salva, un nuovo tentativo riusa questo articolo invece di crearne un doppione
        this.form.articoloId = articolo.articoloId;
        this.articoli = [...this.articoli, articolo];
        this.creaArticolo = false;
      }
      if (this.isNew) {
        await this.service.create6({ body: this.form });
      } else {
        await this.service.update6({ id: this.id!, body: this.form });
      }
      this.router.navigate(['/attrezzature']);
    } catch (e: any) {
      this.error = e instanceof Error ? e.message : errorMessage(e, 'Errore nel salvataggio');
    } finally {
      this.saving = false;
    }
  }

  async deleteItem(): Promise<void> {
    if (!confirm('Eliminare questa attrezzatura?')) return;
    try {
      await this.service.delete6({ id: this.id! });
      this.router.navigate(['/attrezzature']);
    } catch (e: any) {
      this.error = errorMessage(e, 'Errore nell\'eliminazione');
    }
  }

  goBack(): void {
    this.router.navigate(['/attrezzature']);
  }
}
