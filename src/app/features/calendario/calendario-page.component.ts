import { AuthService } from '../../core/auth.service';
import { AdminOnlyDirective } from '../../core/admin-only.directive';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppuntamentiService } from '../../api/services/appuntamenti.service';
import { ClientiService } from '../../api/services/clienti.service';
import { StoriaNoleggiService } from '../../api/services/storia-noleggi.service';
import { AppuntamentoResponse } from '../../api/models/appuntamento-response';
import { AppuntamentoRequest } from '../../api/models/appuntamento-request';
import { ClienteResponse } from '../../api/models/cliente-response';
import { StoriaNoleggioResponse } from '../../api/models/storia-noleggio-response';
import { errorMessage } from '../../shared/error-message';
import { STATI_APPUNTAMENTO, StatoAppuntamento, statoAppuntamento } from '../../shared/stati-appuntamento';
import { AppuntamentiExportService, FormatoExport, PeriodoExport } from './appuntamenti-export.service';
import { addDays, dayKey, parseLocal, startOfDay, startOfWeek, timeOf, toLocalDateTime } from '../../shared/calendar-dates';

type Vista = 'mese' | 'settimana';

interface DayCell {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  events: AppuntamentoResponse[];
}

interface EditorForm {
  tipo: 'censito' | 'manuale';
  docId: number | null;
  clienteNome: string;
  clienteTelefono: string;
  indirizzo: string;
  apparecchio: string;
  titolo: string;
  note: string;
  stato: StatoAppuntamento;
  tecnico: string;
  inizio: string; // yyyy-MM-ddTHH:mm (datetime-local)
  fine: string;
}

const MONTH_CELLS = 42;
const MAX_CHIPS_PER_DAY = 3;

@Component({
  selector: 'app-calendario-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminOnlyDirective],
  templateUrl: './calendario-page.component.html',
  styleUrl: './calendario-page.component.css'
})
export class CalendarioPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly stati = STATI_APPUNTAMENTO;
  readonly giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  readonly maxChips = MAX_CHIPS_PER_DAY;

  vista: Vista = 'mese';
  cursor = startOfDay(new Date());
  days: DayCell[] = [];
  events: AppuntamentoResponse[] = [];
  nascosti = new Set<StatoAppuntamento>();
  loading = false;
  error = '';

  // --- export ---
  exportOpen = false;
  exportPeriodo: PeriodoExport = 'mese';
  exportGiorno = '';           // yyyy-MM-dd
  exporting: FormatoExport | null = null;
  exportError = '';

  // --- editor ---
  editing = false;
  editingId: number | null = null;
  saving = false;
  editorError = '';
  form: EditorForm = this.emptyForm(new Date());

  // --- selezione noleggio censito ---
  clienti: ClienteResponse[] = [];
  clienteQuery = '';
  clienteSelezionato: ClienteResponse | null = null;
  noleggiCliente: StoriaNoleggioResponse[] = [];
  noleggiLoading = false;

  constructor(
    private service: AppuntamentiService,
    private clientiService: ClientiService,
    private noleggiService: StoriaNoleggiService,
    private route: ActivatedRoute,
    private router: Router,
    private exporter: AppuntamentiExportService
  ) {}

  async ngOnInit(): Promise<void> {
    const load = this.load();
    // Clienti serve alla ricerca del noleggio censito: se non arriva, l'inserimento manuale resta disponibile.
    try { this.clienti = await this.clientiService.getAll5(); } catch { /* il calendario funziona comunque */ }
    await load;
    const docId = Number(this.route.snapshot.queryParamMap.get('docId'));
    if (docId) await this.openNew(new Date(), docId);
  }

  // ---------- navigazione ----------

  get titolo(): string {
    if (this.vista === 'mese') {
      const t = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(this.cursor);
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    const start = startOfWeek(this.cursor);
    const end = addDays(start, 6);
    const fmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
    return `${fmt.format(start)} – ${fmt.format(end)} ${end.getFullYear()}`;
  }

  setVista(v: Vista): void {
    if (this.vista === v) return;
    this.vista = v;
    this.load();
  }

  vai(delta: number): void {
    this.cursor = this.vista === 'mese'
      ? new Date(this.cursor.getFullYear(), this.cursor.getMonth() + delta, 1)
      : addDays(this.cursor, 7 * delta);
    this.load();
  }

  oggi(): void {
    this.cursor = startOfDay(new Date());
    this.load();
  }

  apriSettimana(date: Date): void {
    this.cursor = date;
    this.vista = 'settimana';
    this.load();
  }

  private range(): { start: Date; end: Date } {
    if (this.vista === 'settimana') {
      const start = startOfWeek(this.cursor);
      return { start, end: addDays(start, 7) };
    }
    const start = startOfWeek(new Date(this.cursor.getFullYear(), this.cursor.getMonth(), 1));
    return { start, end: addDays(start, MONTH_CELLS) };
  }

  // ---------- caricamento ----------

  async load(): Promise<void> {
    const { start, end } = this.range();
    this.loading = true;
    this.error = '';
    try {
      this.events = await this.service.getByIntervallo({ da: toLocalDateTime(start), a: toLocalDateTime(end) });
    } catch (error) {
      this.events = [];
      this.error = errorMessage(error, 'Errore nel caricamento del calendario');
    } finally {
      this.loading = false;
      this.buildDays();
    }
  }

  buildDays(): void {
    const { start, end } = this.range();
    const todayKey = dayKey(new Date());
    const visibili = this.events.filter(e => !this.nascosti.has(e.stato as StatoAppuntamento));
    const cells: DayCell[] = [];
    for (let d = start; d < end; d = addDays(d, 1)) {
      const dayStart = d.getTime();
      const dayEnd = addDays(d, 1).getTime();
      cells.push({
        date: d,
        key: dayKey(d),
        inMonth: this.vista === 'settimana' || d.getMonth() === this.cursor.getMonth(),
        isToday: dayKey(d) === todayKey,
        // Un appuntamento a cavallo di più giorni compare in ognuno.
        events: visibili.filter(e => e.inizio && e.fine && parseLocal(e.inizio).getTime() < dayEnd && parseLocal(e.fine).getTime() > dayStart)
      });
    }
    this.days = cells;
  }

  // ---------- legenda ----------

  contaStato(stato: StatoAppuntamento): number {
    return this.events.filter(e => e.stato === stato).length;
  }

  toggleStato(stato: StatoAppuntamento): void {
    if (this.nascosti.has(stato)) this.nascosti.delete(stato); else this.nascosti.add(stato);
    this.buildDays();
  }

  // ---------- presentazione ----------

  css(e: AppuntamentoResponse): string { return statoAppuntamento(e.stato).css; }
  simbolo(e: AppuntamentoResponse): string { return statoAppuntamento(e.stato).symbol; }
  orario(e: AppuntamentoResponse): string { return timeOf(e.inizio); }

  etichetta(e: AppuntamentoResponse): string {
    return [e.cliente, e.titolo].filter(Boolean).join(' — ');
  }

  descrizione(e: AppuntamentoResponse): string {
    const stato = statoAppuntamento(e.stato).label;
    const quando = `${timeOf(e.inizio)}–${timeOf(e.fine)}`;
    const dove = e.matricola ? ` · matricola ${e.matricola}` : '';
    const nc = e.censito ? '' : ' · cliente non censito';
    return `${stato}, ${quando}: ${this.etichetta(e)}${dove}${nc}`;
  }

  // ---------- export ----------

  toggleExport(): void {
    this.exportOpen = !this.exportOpen;
    if (!this.exportOpen) return;
    this.exportError = '';
    this.exportPeriodo = this.vista === 'settimana' ? 'settimana' : 'mese';
    // Oggi se rientra nel periodo mostrato, altrimenti il periodo mostrato.
    const { start, end } = this.range();
    const oggi = startOfDay(new Date());
    this.exportGiorno = dayKey(oggi >= start && oggi < end ? oggi : this.vista === 'mese' ? new Date(this.cursor.getFullYear(), this.cursor.getMonth(), 15) : this.cursor);
  }

  /** Testo "dal … al …" del periodo scelto, mostrato sopra i pulsanti per evitare esportazioni sbagliate. */
  get exportRiepilogo(): string {
    if (!this.exportGiorno) return '';
    const { start, end } = this.exporter.intervallo(this.exportPeriodo, parseLocal(this.exportGiorno));
    const fmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    const ultimo = addDays(end, -1);
    return this.exportPeriodo === 'giorno' ? fmt.format(start) : `dal ${fmt.format(start)} al ${fmt.format(ultimo)}`;
  }

  async esporta(formato: FormatoExport): Promise<void> {
    if (!this.exportGiorno || this.exporting) return;
    this.exporting = formato;
    this.exportError = '';
    // Rispetta i filtri della legenda: gli stati nascosti non finiscono nel file.
    const stati = this.nascosti.size ? this.stati.map(s => s.value).filter(s => !this.nascosti.has(s)) : undefined;
    try {
      await this.exporter.scarica(this.exportPeriodo, parseLocal(this.exportGiorno), formato, stati);
    } catch (error) {
      this.exportError = (error as Error).message;
    } finally {
      this.exporting = null;
    }
  }

  // ---------- editor ----------

  private emptyForm(day: Date): EditorForm {
    const inizio = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0);
    return {
      tipo: 'censito', docId: null, clienteNome: '', clienteTelefono: '', indirizzo: '', apparecchio: '',
      titolo: '', note: '', stato: 'DA_CONFERMARE', tecnico: '',
      inizio: toLocalDateTime(inizio).slice(0, 16),
      fine: toLocalDateTime(new Date(inizio.getTime() + 60 * 60 * 1000)).slice(0, 16)
    };
  }

  async openNew(day: Date, docId?: number): Promise<void> {
    if (!this.auth.isAdmin()) return; // il backend rifiuterebbe comunque la scrittura
    this.resetEditor();
    this.form = this.emptyForm(day);
    this.editing = true;
    if (docId) await this.selectNoleggioById(docId);
  }

  async openExisting(e: AppuntamentoResponse): Promise<void> {
    this.resetEditor();
    this.editingId = e.id ?? null;
    this.form = {
      tipo: e.censito ? 'censito' : 'manuale',
      docId: e.docId ?? null,
      clienteNome: e.censito ? '' : e.cliente ?? '',
      clienteTelefono: e.censito ? '' : e.clienteTelefono ?? '',
      indirizzo: e.indirizzo ?? '',
      apparecchio: e.apparecchio ?? '',
      titolo: e.titolo ?? '',
      note: e.note ?? '',
      stato: (e.stato ?? 'DA_CONFERMARE') as StatoAppuntamento,
      tecnico: e.tecnico ?? '',
      inizio: (e.inizio ?? '').slice(0, 16),
      fine: (e.fine ?? '').slice(0, 16)
    };
    this.editing = true;
    if (e.censito && e.clienteId) {
      this.clienteSelezionato = this.clienti.find(c => c.id === e.clienteId) ?? { id: e.clienteId, ragioneSociale: e.cliente };
      await this.loadNoleggiCliente(e.clienteId);
    }
  }

  private resetEditor(): void {
    this.editingId = null;
    this.editorError = '';
    this.clienteQuery = '';
    this.clienteSelezionato = null;
    this.noleggiCliente = [];
  }

  @HostListener('document:keydown.escape')
  closeEditor(): void {
    if (this.editing && !this.saving) this.editing = false;
  }

  get suggerimentiClienti(): ClienteResponse[] {
    const q = this.clienteQuery.trim().toLowerCase();
    if (!q || this.clienteSelezionato) return [];
    return this.clienti
      .filter(c => `${c.ragioneSociale ?? ''} ${c.codice ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }

  async selectCliente(c: ClienteResponse): Promise<void> {
    this.clienteSelezionato = c;
    this.clienteQuery = '';
    this.form.docId = null;
    if (c.id !== undefined) await this.loadNoleggiCliente(c.id);
  }

  clearCliente(): void {
    this.clienteSelezionato = null;
    this.noleggiCliente = [];
    this.form.docId = null;
  }

  private async loadNoleggiCliente(clienteId: number): Promise<void> {
    this.noleggiLoading = true;
    try { this.noleggiCliente = await this.noleggiService.getByCliente1({ clienteId }); }
    catch (error) { this.editorError = errorMessage(error, 'Errore nel caricamento dei noleggi del cliente'); }
    finally { this.noleggiLoading = false; }
  }

  /** Arrivo da "Pianifica assistenza" nel dettaglio di un noleggio: preseleziona cliente e noleggio. */
  private async selectNoleggioById(docId: number): Promise<void> {
    try {
      const n = await this.noleggiService.getById1({ docId });
      if (n.clienteId !== undefined) {
        this.clienteSelezionato = this.clienti.find(c => c.id === n.clienteId) ?? { id: n.clienteId, ragioneSociale: `Cliente ${n.clienteId}` };
        await this.loadNoleggiCliente(n.clienteId);
      } else {
        this.noleggiCliente = [n];
      }
      this.form.docId = n.docId ?? docId;
      this.form.apparecchio = n.descrizione ?? '';
    } catch (error) {
      this.editorError = errorMessage(error, 'Noleggio non trovato');
    }
  }

  etichettaNoleggio(n: StoriaNoleggioResponse): string {
    const nome = n.descrizione || n.codiceArticolo || 'Noleggio';
    return `${n.matricola || 'senza matricola'} · ${nome} (doc. ${n.docId}${n.dataDoc ? ' del ' + n.dataDoc : ''})`;
  }

  onNoleggioChange(docId: number | null): void {
    const n = this.noleggiCliente.find(x => x.docId === docId);
    if (n && !this.form.apparecchio) this.form.apparecchio = n.descrizione ?? '';
  }

  /** Spostando l'inizio, la fine lo segue mantenendo la durata. */
  onInizioChange(nuovo: string): void {
    const vecchio = this.form.inizio;
    this.form.inizio = nuovo;
    if (!nuovo || !vecchio || !this.form.fine) return;
    const durata = parseLocal(this.form.fine).getTime() - parseLocal(vecchio).getTime();
    if (durata > 0) {
      this.form.fine = toLocalDateTime(new Date(parseLocal(nuovo).getTime() + durata)).slice(0, 16);
    }
  }

  private validate(): string {
    const f = this.form;
    if (!f.titolo.trim()) return 'Il titolo è obbligatorio';
    if (f.tipo === 'censito' && f.docId === null) return 'Seleziona il cliente e il noleggio, oppure passa a "Cliente non censito"';
    if (f.tipo === 'manuale' && !f.clienteNome.trim()) return 'Il nome del cliente è obbligatorio per un cliente non censito';
    if (!f.inizio || !f.fine) return 'Inizio e fine sono obbligatori';
    if (parseLocal(f.fine) <= parseLocal(f.inizio)) return 'La fine deve essere successiva all’inizio';
    return '';
  }

  private toRequest(): AppuntamentoRequest {
    const f = this.form;
    const censito = f.tipo === 'censito';
    return {
      docId: censito ? f.docId ?? undefined : undefined,
      clienteNome: censito ? undefined : f.clienteNome.trim(),
      clienteTelefono: censito ? undefined : f.clienteTelefono.trim() || undefined,
      indirizzo: f.indirizzo.trim() || undefined,
      apparecchio: f.apparecchio.trim() || undefined,
      titolo: f.titolo.trim(),
      note: f.note.trim() || undefined,
      stato: f.stato,
      inizio: f.inizio.length === 16 ? f.inizio + ':00' : f.inizio,
      fine: f.fine.length === 16 ? f.fine + ':00' : f.fine,
      tecnico: f.tecnico.trim() || undefined
    };
  }

  async save(): Promise<void> {
    this.editorError = this.validate();
    if (this.editorError) return;
    this.saving = true;
    try {
      const body = this.toRequest();
      if (this.editingId === null) await this.service.create7({ body });
      else await this.service.update7({ id: this.editingId, body });
      this.editing = false;
      await this.load();
    } catch (error) {
      this.editorError = errorMessage(error, 'Errore nel salvataggio dell’appuntamento');
    } finally {
      this.saving = false;
    }
  }

  async cambiaStato(stato: StatoAppuntamento): Promise<void> {
    if (this.editingId === null) { this.form.stato = stato; return; }
    this.saving = true;
    this.editorError = '';
    try {
      await this.service.updateStato({ id: this.editingId, body: { stato } });
      this.editing = false;
      await this.load();
    } catch (error) {
      this.editorError = errorMessage(error, 'Errore nel cambio di stato');
    } finally {
      this.saving = false;
    }
  }

  async remove(): Promise<void> {
    if (this.editingId === null || !confirm('Eliminare definitivamente questo appuntamento? Per tenerne traccia usa "Annulla appuntamento".')) return;
    this.saving = true;
    try {
      await this.service.delete7({ id: this.editingId });
      this.editing = false;
      await this.load();
    } catch (error) {
      this.editorError = errorMessage(error, 'Errore nell’eliminazione');
    } finally {
      this.saving = false;
    }
  }

  vaiANoleggio(): void {
    if (this.form.docId !== null) this.router.navigate(['/noleggi', this.form.docId]);
  }
}
