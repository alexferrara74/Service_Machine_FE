import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type * as THREE from 'three';
import { Cella, ScaffaleLayout, ScaffaliService } from './scaffali.service';
import { CatalogoProdottiService } from '../catalogo/catalogo-prodotti.service';
import { ProdottoCatalogo } from '../catalogo/prodotto-catalogo';
import { errorMessage } from '../../shared/error-message';

type ThreeModule = typeof import('three');

const CM = 0.01; // la scena è in metri
const COLORI = { vuota: 0xb8c4c1, occupata: 0x2e9d6b, trovata: 0xf2b705, struttura: 0x12414a };

@Component({
  selector: 'app-magazzino-3d-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Magazzino 3D</h1>
        <div class="actions">
          <input class="form-control" type="search" placeholder="Cerca articolo (codice o descrizione)" [(ngModel)]="ricerca" (ngModelChange)="aggiornaColori()">
          <span *ngIf="ricerca.trim()" class="found">{{ trovate }} celle</span>
          <button type="button" class="btn" [class.btn-primary]="modoSposta" [class.btn-secondary]="!modoSposta" (click)="toggleSposta()">{{ modoSposta ? 'Fine spostamento' : 'Sposta scaffali' }}</button>
          <button type="button" class="btn btn-secondary" [disabled]="stampando" (click)="stampaEtichette()">{{ stampando ? 'Preparo…' : 'Stampa etichette' }}</button>
          <a routerLink="/scaffali" class="btn btn-primary">Gestisci scaffali</a>
        </div>
      </header>
      <div *ngIf="error" class="error-block">{{ error }}</div>
      <div class="layout">
        <div class="viewport" #viewport>
          <p *ngIf="!loading && !scaffali.length" class="empty">Nessuno scaffale definito: creane uno da “Gestisci scaffali”.</p>
          <div class="legend"><span class="dot vuota"></span>Vuota <span class="dot occupata"></span>Con articoli <span class="dot trovata"></span>Risultato ricerca</div>
        </div>
        <aside class="panel">
          <ng-container *ngIf="modoSposta">
            <h2>Sposta scaffali</h2>
            <p class="meta">Trascina uno scaffale sul pavimento: la posizione si aggiorna al rilascio (passo 5 cm).</p>
            <ng-container *ngIf="scaffaleSelezionato as s">
              <p><strong>{{ s.codice }}</strong> · centro {{ s.posXCm }}, {{ s.posYCm }} cm · {{ s.rotazioneGradi }}°</p>
              <button type="button" class="btn btn-secondary" [disabled]="busy" (click)="ruota(s)">Ruota di 90°</button>
            </ng-container>
          </ng-container>
          <ng-container *ngIf="!modoSposta && selezionata as c; else nessuna">
            <h2>{{ c.etichetta }}</h2>
            <p class="meta">{{ scaffaleDi(c)?.zona }} · scaffale {{ scaffaleDi(c)?.codice }} · ripiano {{ c.ripiano }} · posizione {{ c.posizione }}</p>
            <ul class="articoli" *ngIf="c.articoli.length; else vuota">
              <li *ngFor="let a of c.articoli">
                <div><strong>{{ a.codice || ('#' + a.articoloId) }}</strong><br><small>{{ a.descrizione }}</small></div>
                <input class="form-control qty" type="number" min="0" [ngModel]="a.quantita" (change)="cambiaQuantita(c, a, $any($event.target).value)">
                <button type="button" class="btn btn-danger" (click)="rimuovi(a.posizioneId)" aria-label="Rimuovi">✕</button>
              </li>
            </ul>
            <ng-template #vuota><p class="meta">Cella vuota.</p></ng-template>
            <h3>Assegna articolo</h3>
            <input class="form-control" type="search" placeholder="Cerca nel catalogo…" [(ngModel)]="filtroCatalogo">
            <ul class="risultati" *ngIf="filtroCatalogo.trim()">
              <li *ngFor="let p of catalogoFiltrato">
                <button type="button" [class.sel]="p.articoloId === articoloScelto?.articoloId" (click)="articoloScelto = p">
                  <strong>{{ p.codice }}</strong> {{ p.descrizione }}
                </button>
              </li>
              <li *ngIf="!catalogoFiltrato.length" class="meta">Nessun articolo trovato.</li>
            </ul>
            <div class="assegna" *ngIf="articoloScelto">
              <span><strong>{{ articoloScelto.codice }}</strong></span>
              <input class="form-control qty" type="number" min="0" [(ngModel)]="quantitaNuova" aria-label="Quantità">
              <button type="button" class="btn btn-primary" [disabled]="busy" (click)="assegna(c)">Assegna</button>
            </div>
          </ng-container>
          <ng-template #nessuna><p *ngIf="!modoSposta" class="meta">Clicca una cella dello scaffale per vedere l’etichetta e assegnare gli articoli. Trascina per ruotare, rotella per lo zoom.</p></ng-template>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    .page-header,.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .page-header{justify-content:space-between;margin-bottom:16px}
    .page-header h1{margin:0}
    .layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px}
    .viewport{position:relative;height:calc(100vh - 170px);min-height:420px;background:#dfe6e4;border-radius:12px;overflow:hidden}
    .viewport :is(canvas){display:block}
    .empty{position:absolute;inset:0;display:grid;place-items:center;margin:0;color:var(--muted)}
    .legend{position:absolute;left:12px;bottom:12px;padding:6px 10px;background:#ffffffd9;border-radius:8px;font-size:12px;display:flex;gap:6px;align-items:center}
    .dot{width:10px;height:10px;border-radius:2px;display:inline-block;margin-left:8px}
    .dot.vuota{background:#b8c4c1}.dot.occupata{background:#2e9d6b}.dot.trovata{background:#f2b705}
    .panel{padding:16px;background:var(--surface);border-radius:12px;box-shadow:0 2px 8px #00000012;overflow:auto;max-height:calc(100vh - 170px)}
    .panel h2{margin:0 0 4px;font-size:18px}.panel h3{margin:18px 0 8px;font-size:14px}
    .meta{color:var(--muted);margin:0 0 10px}
    .articoli,.risultati{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:6px}
    .articoli li{display:grid;grid-template-columns:1fr 70px auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
    .risultati{max-height:180px;overflow:auto}
    .risultati button{width:100%;text-align:left;padding:7px;border:1px solid var(--line);border-radius:6px;background:var(--paper-2);cursor:pointer}
    .risultati button.sel{border-color:var(--petrol);background:var(--info-bg)}
    .assegna{display:grid;grid-template-columns:1fr 70px auto;gap:8px;align-items:center;margin-top:8px}
    .qty{width:100%}
    .found{color:var(--muted)}
    .form-control{min-width:0;padding:9px;border:1px solid var(--field);border-radius:6px}
    .error-block{margin:12px 0;padding:10px;background:var(--danger-bg);color:var(--danger)}
    .btn{padding:9px 14px;border:0;border-radius:6px;cursor:pointer;white-space:nowrap;text-decoration:none;color:inherit}
    .btn-primary{background:var(--petrol);color:white}.btn-secondary{background:var(--line)}.btn-danger{background:var(--danger);color:white;padding:6px 9px}
    @media(max-width:900px){.layout{grid-template-columns:1fr}.panel{max-height:none}.viewport{height:60vh}}
  `]
})
export class Magazzino3dPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLDivElement>;

  scaffali: ScaffaleLayout[] = [];
  catalogo: ProdottoCatalogo[] = [];
  loading = true;
  busy = false;
  error = '';
  ricerca = '';
  filtroCatalogo = '';
  articoloScelto: ProdottoCatalogo | null = null;
  quantitaNuova = 1;
  selezionataId: number | null = null;
  trovate = 0;
  modoSposta = false;
  stampando = false;
  scaffaleSelId: number | null = null;

  private T!: ThreeModule;
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: { update(): void; enabled: boolean; target: THREE.Vector3; dispose(): void };
  private contenuto?: THREE.Group;
  private celleMesh = new Map<number, THREE.Mesh>();
  private frame = 0;
  private observer?: ResizeObserver;
  private cameraImpostata = false;
  private distrutto = false;
  private gruppiScaffale = new Map<number, THREE.Group>();
  private trascinamento: { id: number; group: THREE.Group; dx: number; dz: number } | null = null;

  constructor(
    private service: ScaffaliService,
    private catalogoService: CatalogoProdottiService,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  get selezionata(): Cella | null {
    if (this.selezionataId === null) return null;
    for (const s of this.scaffali) for (const c of s.celle) if (c.ubicazioneId === this.selezionataId) return c;
    return null;
  }

  get catalogoFiltrato(): ProdottoCatalogo[] {
    const q = this.filtroCatalogo.trim().toLowerCase();
    if (!q) return [];
    return this.catalogo.filter(p => p.codice.toLowerCase().includes(q) || p.descrizione.toLowerCase().includes(q)).slice(0, 25);
  }

  scaffaleDi(c: Cella): ScaffaleLayout | undefined {
    return this.scaffali.find(s => s.celle.some(x => x.ubicazioneId === c.ubicazioneId));
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.T = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    if (this.distrutto) return;
    this.initScena(OrbitControls);
    this.catalogoService.getAll().then(c => this.catalogo = c).catch(() => { /* il catalogo serve solo per assegnare */ });
    await this.ricarica();
  }

  ngOnDestroy(): void {
    this.distrutto = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  private initScena(OrbitControls: typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls): void {
    const T = this.T;
    const host = this.viewportRef.nativeElement;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0xdfe6e4);
    this.camera = new T.PerspectiveCamera(50, 1, 0.1, 500);
    this.renderer = new T.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.prepend(this.renderer.domElement);
    this.scene.add(new T.HemisphereLight(0xffffff, 0x8899a0, 1.6));
    const sole = new T.DirectionalLight(0xffffff, 1.4);
    sole.position.set(8, 14, 6);
    this.scene.add(sole);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    (this.controls as unknown as { maxPolarAngle: number }).maxPolarAngle = Math.PI / 2.05;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      this.renderer!.setSize(w, h);
      this.camera!.aspect = w / h;
      this.camera!.updateProjectionMatrix();
    };
    this.observer = new ResizeObserver(resize);
    this.observer.observe(host);
    resize();

    let down: { x: number; y: number } | null = null;
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', e => {
      down = { x: e.clientX, y: e.clientY };
      if (this.modoSposta) this.iniziaTrascinamento(e);
    });
    canvas.addEventListener('pointermove', e => this.trascina(e));
    canvas.addEventListener('pointerup', e => {
      if (this.trascinamento) { this.zone.run(() => this.finisciTrascinamento()); down = null; return; }
      if (!this.modoSposta && down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) this.zone.run(() => this.clic(e));
      down = null;
    });

    this.zone.runOutsideAngular(() => {
      const loop = () => {
        this.frame = requestAnimationFrame(loop);
        this.controls!.update();
        this.renderer!.render(this.scene!, this.camera!);
      };
      loop();
    });
  }

  async ricarica(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.scaffali = await this.service.layout();
      this.costruisci();
      this.aggiornaColori();
    } catch (e) { this.error = errorMessage(e, 'Errore nel caricamento del magazzino'); }
    finally { this.loading = false; }
  }

  private costruisci(): void {
    const T = this.T;
    if (!this.scene) return;
    if (this.contenuto) {
      this.scene.remove(this.contenuto);
      this.contenuto.traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(x => x.dispose()); else mat?.dispose();
      });
    }
    this.celleMesh.clear();
    this.gruppiScaffale.clear();
    const g = this.contenuto = new T.Group();
    const struttura = new T.MeshStandardMaterial({ color: COLORI.struttura, roughness: 0.6 });

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of this.scaffali) {
      const w = s.larghezzaCm * CM, d = s.profonditaCm * CM, h = s.altezzaCm * CM;
      const cx = s.posXCm * CM, cz = s.posYCm * CM;
      const raggio = Math.hypot(w, d) / 2;
      minX = Math.min(minX, cx - raggio); maxX = Math.max(maxX, cx + raggio);
      minZ = Math.min(minZ, cz - raggio); maxZ = Math.max(maxZ, cz + raggio);

      const sg = new T.Group();
      sg.position.set(cx, 0, cz);
      sg.rotation.y = -s.rotazioneGradi * Math.PI / 180;
      const spessore = 0.03;
      const box = (bw: number, bh: number, bd: number, x: number, y: number, z: number) => {
        const m = new T.Mesh(new T.BoxGeometry(bw, bh, bd), struttura);
        m.position.set(x, y, z);
        sg.add(m);
      };
      for (const px of [-w / 2, w / 2]) for (const pz of [-d / 2, d / 2]) box(spessore, h, spessore, px, h / 2, pz);
      const passoH = h / s.numeroRipiani;
      for (let r = 0; r <= s.numeroRipiani; r++) box(w, spessore, d, 0, Math.max(r * passoH, spessore / 2), 0);

      const passoW = w / s.posizioniPerRipiano;
      for (const c of s.celle) {
        const m = new T.Mesh(
          new T.BoxGeometry(passoW * 0.9, passoH * 0.78, d * 0.88),
          new T.MeshStandardMaterial({ color: COLORI.vuota, transparent: true, opacity: 0.3, roughness: 0.7 })
        );
        m.position.set(-w / 2 + (c.posizione - 0.5) * passoW, (c.ripiano - 1) * passoH + spessore + passoH * 0.39, 0);
        m.userData['ubicazioneId'] = c.ubicazioneId;
        sg.add(m);
        this.celleMesh.set(c.ubicazioneId, m);
      }
      sg.add(this.targhetta(s.codice, h + 0.25));
      sg.userData['scaffaleId'] = s.scaffaleId;
      this.gruppiScaffale.set(s.scaffaleId, sg);
      g.add(sg);
    }

    if (this.scaffali.length) {
      const pad = 2;
      const w = maxX - minX + pad * 2, d = maxZ - minZ + pad * 2;
      const size = Math.max(w, d);
      const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
      const pavimento = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ color: 0xf0f3f2 }));
      pavimento.rotation.x = -Math.PI / 2;
      pavimento.position.set(cx, -0.002, cz);
      g.add(pavimento);
      const griglia = new T.GridHelper(size, Math.max(2, Math.round(size)), 0xaebbb8, 0xd0d9d7);
      griglia.position.set(cx, 0, cz);
      g.add(griglia);
      if (!this.cameraImpostata) {
        this.camera!.position.set(cx, size * 0.5, cz + size * 0.6);
        this.controls!.target.set(cx, 1, cz);
        this.cameraImpostata = true;
      }
    }
    this.scene.add(g);
  }

  private targhetta(testo: string, y: number): THREE.Sprite {
    const T = this.T;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#12414a';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(testo, 128, 50);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(canvas), depthTest: false }));
    sprite.scale.set(0.8, 0.3, 1);
    sprite.position.set(0, y, 0);
    sprite.renderOrder = 10;
    return sprite;
  }

  aggiornaColori(): void {
    const q = this.ricerca.trim().toLowerCase();
    let trovate = 0;
    for (const s of this.scaffali) for (const c of s.celle) {
      const mesh = this.celleMesh.get(c.ubicazioneId);
      if (!mesh) continue;
      const match = !!q && c.articoli.some(a => (a.codice ?? '').toLowerCase().includes(q) || (a.descrizione ?? '').toLowerCase().includes(q));
      if (match) trovate++;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const sel = c.ubicazioneId === this.selezionataId;
      mat.color.setHex(match ? COLORI.trovata : c.articoli.length ? COLORI.occupata : COLORI.vuota);
      mat.opacity = sel ? 1 : match ? 0.95 : c.articoli.length ? 0.8 : 0.3;
      mat.emissive.setHex(sel ? 0x1d5f6b : 0x000000);
    }
    this.trovate = trovate;
  }

  private clic(e: PointerEvent): void {
    const T = this.T;
    const canvas = this.renderer!.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, this.camera!);
    const hit = ray.intersectObjects([...this.celleMesh.values()], false)[0];
    this.selezionataId = hit ? (hit.object.userData['ubicazioneId'] as number) : null;
    this.articoloScelto = null; this.filtroCatalogo = ''; this.quantitaNuova = 1;
    this.aggiornaColori();
  }

  get scaffaleSelezionato(): ScaffaleLayout | undefined {
    return this.scaffali.find(s => s.scaffaleId === this.scaffaleSelId);
  }

  toggleSposta(): void {
    this.modoSposta = !this.modoSposta;
    this.scaffaleSelId = null;
    this.selezionataId = null;
    this.aggiornaColori();
  }

  private puntoSuPavimento(e: PointerEvent): THREE.Vector3 | null {
    const T = this.T;
    const rect = this.renderer!.domElement.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, this.camera!);
    const p = new T.Vector3();
    return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p) ? p : null;
  }

  private iniziaTrascinamento(e: PointerEvent): void {
    const T = this.T;
    const rect = this.renderer!.domElement.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, this.camera!);
    const hit = ray.intersectObjects([...this.gruppiScaffale.values()], true)[0];
    if (!hit) { this.zone.run(() => this.scaffaleSelId = null); return; }
    let o: THREE.Object3D | null = hit.object;
    while (o && o.userData['scaffaleId'] === undefined) o = o.parent;
    if (!o) return;
    const punto = this.puntoSuPavimento(e);
    this.controls!.enabled = false;
    this.trascinamento = { id: o.userData['scaffaleId'], group: o as THREE.Group, dx: punto ? o.position.x - punto.x : 0, dz: punto ? o.position.z - punto.z : 0 };
    this.zone.run(() => this.scaffaleSelId = this.trascinamento!.id);
  }

  private trascina(e: PointerEvent): void {
    if (!this.trascinamento) return;
    const p = this.puntoSuPavimento(e);
    if (!p) return;
    const snap = (v: number) => Math.max(0, Math.round(v * 100 / 5) * 5) * CM;
    this.trascinamento.group.position.x = snap(p.x + this.trascinamento.dx);
    this.trascinamento.group.position.z = snap(p.z + this.trascinamento.dz);
  }

  private async finisciTrascinamento(): Promise<void> {
    const t = this.trascinamento;
    this.trascinamento = null;
    this.controls!.enabled = true;
    const s = this.scaffali.find(x => x.scaffaleId === t?.id);
    if (!t || !s) return;
    const x = Math.round(t.group.position.x / CM), y = Math.round(t.group.position.z / CM);
    if (x === s.posXCm && y === s.posYCm) return;
    await this.salvaScaffale(s, { posXCm: x, posYCm: y });
  }

  ruota(s: ScaffaleLayout): Promise<void> {
    return this.salvaScaffale(s, { rotazioneGradi: (s.rotazioneGradi + 90) % 360 });
  }

  private async salvaScaffale(s: ScaffaleLayout, modifiche: Partial<ScaffaleLayout>): Promise<void> {
    this.busy = true; this.error = '';
    try {
      await this.service.update(s.scaffaleId, {
        codice: s.codice, zona: s.zona, larghezzaCm: s.larghezzaCm, profonditaCm: s.profonditaCm, altezzaCm: s.altezzaCm,
        posXCm: s.posXCm, posYCm: s.posYCm, rotazioneGradi: s.rotazioneGradi,
        numeroRipiani: s.numeroRipiani, posizioniPerRipiano: s.posizioniPerRipiano, ...modifiche
      });
    } catch (e) { this.error = errorMessage(e, 'Errore nello spostamento dello scaffale'); }
    finally { this.busy = false; await this.ricarica(); }
  }

  async assegna(c: Cella): Promise<void> {
    if (!this.articoloScelto) return;
    await this.esegui(() => this.service.assegna(c.ubicazioneId, this.articoloScelto!.articoloId, this.quantitaNuova), 'Errore nell’assegnazione');
    this.articoloScelto = null; this.filtroCatalogo = '';
  }

  cambiaQuantita(c: Cella, a: { posizioneId: number; articoloId: number }, valore: string): Promise<void> {
    return this.esegui(() => this.service.aggiornaQuantita(a.posizioneId, c.ubicazioneId, a.articoloId, Number(valore)), 'Errore nell’aggiornamento della quantità');
  }

  rimuovi(posizioneId: number): Promise<void> {
    return this.esegui(() => this.service.rimuovi(posizioneId), 'Errore nella rimozione');
  }

  private async esegui(op: () => Promise<unknown>, fallback: string): Promise<void> {
    this.busy = true; this.error = '';
    try { await op(); await this.ricarica(); }
    catch (e) { this.error = errorMessage(e, fallback); }
    finally { this.busy = false; }
  }

  /** Apre una pagina di sola stampa con le etichette: dello scaffale selezionato, altrimenti di tutti. */
  async stampaEtichette(): Promise<void> {
    const w = window.open('', '_blank');
    if (!w) { this.error = 'Il browser ha bloccato la finestra di stampa'; return; }
    this.stampando = true;
    const sel = this.selezionata;
    const elenco = sel ? this.scaffali.filter(s => s === this.scaffaleDi(sel)) : this.scaffali;
    const esc = (v: string) => v.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
    let etichette = '';
    try {
      const QR = await import('qrcode');
      for (const s of elenco) for (const c of s.celle) {
        const qr = await QR.toDataURL(c.etichetta, { margin: 1, width: 180, errorCorrectionLevel: 'M' });
        etichette += `<div class="et"><img src="${qr}" alt=""><div><div class="cod">${esc(c.etichetta)}</div>
          <div class="sub">${esc(s.zona)} · Rip. ${c.ripiano} · Pos. ${c.posizione}</div></div></div>`;
      }
    } catch (e) {
      w.close();
      this.error = errorMessage(e, 'Errore nella generazione delle etichette');
      return;
    } finally { this.stampando = false; }
    w.document.write(`<!doctype html><title>Etichette magazzino</title><style>
      body{font-family:system-ui,sans-serif;margin:10mm}
      .griglia{display:grid;grid-template-columns:repeat(2,1fr);gap:4mm}
      .et{display:flex;align-items:center;gap:4mm;border:1.5px solid #000;border-radius:3mm;padding:4mm;break-inside:avoid}
      .et img{width:26mm;height:26mm}
      .cod{font-size:18pt;font-weight:700;letter-spacing:.5px}.sub{font-size:9pt;margin-top:2mm}
    </style><div class="griglia">${etichette}</div><script>onload=()=>print()<\/script>`);
    w.document.close();
  }
}
