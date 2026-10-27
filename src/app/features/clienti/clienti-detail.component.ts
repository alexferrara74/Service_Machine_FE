import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientiService } from '../../api/services/clienti.service';
import { ClienteResponse } from '../../api/models/cliente-response';
import { ClienteRequest } from '../../api/models/cliente-request';
import { ClienteStatisticheService } from '../../api/services/cliente-statistiche.service';
import { ClienteManutenzioneService } from '../../api/services/cliente-manutenzione.service';
import { NoleggioManutenzionePianificazioneRequest } from '../../api/models/noleggio-manutenzione-pianificazione-request';
import { ClienteStatisticheResponse } from '../../api/models/cliente-statistiche-response';

@Component({
  selector: 'app-clienti-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clienti-detail.component.html',
  styleUrl: './clienti-detail.component.css'
})
export class ClientiDetailComponent implements OnInit {
  isNew = false;
  loading = false;
  saving = false;
  error = '';
  maintenanceSettingsError = '';
  maintenanceSettingsLoading = false;
  maintenancePlanError = '';
  maintenancePlanSaved = false;
  maintenancePlanSaving = false;
  maintenancePlanConfigured = false;
  noticeDays = 7;
  maintenancePeriods: NoleggioManutenzionePianificazioneRequest['periodi'] = [];
  statisticsLoading = false;
  statisticsError = '';
  filteredStatistics?: ClienteStatisticheResponse;
  statisticsDal = '';
  statisticsAl = '';
  id: number | null = null;

  form: ClienteRequest = {
    codice: '',
    ragioneSociale: '',
    nome: '',
    cognome: '',
    codiceFiscale: '',
    partitaIva: '',
    email: '',
    telefono: '',
    tipoListino: undefined
  };

  constructor(
    private service: ClientiService,
    private route: ActivatedRoute,
    private router: Router,
    private maintenanceService: ClienteManutenzioneService,
    private statisticsService: ClienteStatisticheService
  ) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || idParam === 'new') {
      this.isNew = true;
      return;
    }
    this.id = Number(idParam);
    this.loading = true;
    try {
      const data: ClienteResponse = await this.service.getById5({ id: this.id });
      this.form = {
        codice: data.codice ?? '',
        ragioneSociale: data.ragioneSociale ?? '',
        nome: data.nome ?? '',
        cognome: data.cognome ?? '',
        codiceFiscale: data.codiceFiscale ?? '',
        partitaIva: data.partitaIva ?? '',
        email: data.email ?? '',
        telefono: data.telefono ?? '',
        tipoListino: data.tipoListino ?? undefined
      };
      await this.loadCustomerInfo();
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel caricamento';
    } finally {
      this.loading = false;
    }
  }

  async loadCustomerInfo(): Promise<void> {
    if (this.id === null) return;
    this.maintenanceSettingsLoading = true;
    this.maintenanceSettingsError = '';
    try {
      const [schedule, statistics] = await Promise.all([
        this.maintenanceService.getPianificazione(this.id),
        this.statisticsService.getStatistiche(this.id)
      ]);
      this.filteredStatistics = statistics;
      this.noticeDays = schedule?.giorniAvviso ?? 7;
      this.maintenancePlanConfigured = schedule !== null;
      this.maintenancePeriods = schedule?.periodi.map(period => ({ ...period })) ?? [];
    } catch (error) {
      this.maintenanceSettingsError = this.message(error, 'Impossibile caricare i dati del cliente');
    } finally {
      this.maintenanceSettingsLoading = false;
    }
  }

  addMaintenancePeriod(): void {
    this.maintenancePeriods.push({ dataInizio: '', dataFine: '', intervalloGiorni: 90 });
  }

  removeMaintenancePeriod(index: number): void {
    this.maintenancePeriods.splice(index, 1);
  }

  async saveMaintenanceSchedule(): Promise<void> {
    this.maintenancePlanError = '';
    this.maintenancePlanSaved = false;
    if (this.id === null) {
      this.maintenancePlanError = 'ID cliente non valido.';
      return;
    }
    if (!Number.isInteger(this.noticeDays) || this.noticeDays < 0) {
      this.maintenancePlanError = 'I giorni di preavviso devono essere un numero intero non negativo.';
      return;
    }
    if (!this.maintenancePeriods.length || this.maintenancePeriods.some(period =>
      !period.dataInizio || !period.dataFine ||
      period.dataInizio > period.dataFine ||
      !Number.isInteger(period.intervalloGiorni) ||
      period.intervalloGiorni <= 0
    )) {
      this.maintenancePlanError = 'Inserisci almeno un periodo con date valide e intervallo maggiore di zero.';
      return;
    }
    const schedule: NoleggioManutenzionePianificazioneRequest = {
      giorniAvviso: this.noticeDays,
      periodi: this.maintenancePeriods.map(period => ({ ...period }))
    };
    this.maintenancePlanSaving = true;
    try {
      await this.maintenanceService.configuraPianificazione(this.id, schedule);
      this.maintenancePlanConfigured = true;
      this.maintenancePlanSaved = true;
    } catch (error) {
      this.maintenancePlanError = this.message(error, 'Errore nel salvataggio della pianificazione manutentiva');
    } finally {
      this.maintenancePlanSaving = false;
    }
  }

  async loadStatisticsForPeriod(): Promise<void> {
    if (this.id === null) return;
    this.statisticsLoading = true;
    this.statisticsError = '';
    try {
      this.filteredStatistics = await this.statisticsService.getStatistiche(
        this.id,
        this.statisticsDal || undefined,
        this.statisticsAl || undefined
      );
    } catch (error) {
      this.statisticsError = this.message(error, 'Errore nel caricamento delle statistiche');
    } finally {
      this.statisticsLoading = false;
    }
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      if (this.isNew) {
        await this.service.create5({ body: this.form });
      } else {
        await this.service.update5({ id: this.id!, body: this.form });
      }
      this.router.navigate(['/clienti']);
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel salvataggio';
    } finally {
      this.saving = false;
    }
  }

  async deleteItem(): Promise<void> {
    if (!confirm('Eliminare questo cliente?')) return;
    try {
      await this.service.delete5({ id: this.id! });
      this.router.navigate(['/clienti']);
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nell\'eliminazione';
    }
  }

  goBack(): void {
    this.router.navigate(['/clienti']);
  }
}
