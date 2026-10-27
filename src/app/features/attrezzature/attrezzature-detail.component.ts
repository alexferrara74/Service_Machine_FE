import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AttrezzatureService } from '../../api/services/attrezzature.service';
import { AttrezzaturaResponse } from '../../api/models/attrezzatura-response';
import { AttrezzaturaRequest } from '../../api/models/attrezzatura-request';

@Component({
  selector: 'app-attrezzature-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './attrezzature-detail.component.html',
  styleUrl: './attrezzature-detail.component.css'
})
export class AttrezzatureDetailComponent implements OnInit {
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
    stato: ''
  };

  statiOptions = ['Disponibile', 'Noleggiata', 'In Manutenzione'];

  constructor(
    private service: AttrezzatureService,
    private route: ActivatedRoute,
    private router: Router
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
      const data: AttrezzaturaResponse = await this.service.getById6({ id: this.id });
      this.form = {
        descrizione: data.descrizione ?? '',
        marca: data.marca ?? '',
        modello: data.modello ?? '',
        matricola: data.matricola ?? '',
        stato: data.stato ?? ''
      };
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel caricamento';
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = '';
    try {
      if (this.isNew) {
        await this.service.create6({ body: this.form });
      } else {
        await this.service.update6({ id: this.id!, body: this.form });
      }
      this.router.navigate(['/attrezzature']);
    } catch (e: any) {
      this.error = e?.message ?? 'Errore nel salvataggio';
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
      this.error = e?.message ?? 'Errore nell\'eliminazione';
    }
  }

  goBack(): void {
    this.router.navigate(['/attrezzature']);
  }
}
