import { TestBed } from '@angular/core/testing';
import { OpzioneRicerca, SelectRicercaComponent } from './select-ricerca.component';

function crea(opzioni: OpzioneRicerca[], voceVuota = '') {
  const fixture = TestBed.createComponent(SelectRicercaComponent);
  const c = fixture.componentInstance;
  c.opzioni = opzioni;
  c.voceVuota = voceVuota;
  const scelti: unknown[] = [];
  c.registerOnChange(v => scelti.push(v));
  return { c, scelti };
}

const opzioni: OpzioneRicerca[] = [
  { value: 1, label: 'C001 — Bar Centrale Srl', gruppo: 'ERP' },
  { value: 2, label: 'C002 — Caffè Città', gruppo: 'ERP' },
  { value: 3, label: 'M001 — Ristorante Da Gino', gruppo: 'A mano', cerca: '01234567890' },
];

describe('menu con ricerca', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [SelectRicercaComponent] }));

  const etichette = (c: SelectRicercaComponent) => c.righe.filter(r => r.opzione).map(r => r.opzione!.label);

  it('filters by every word in any order, ignoring case and accents', () => {
    const { c } = crea(opzioni);
    c.apri();
    c.scrivi('centrale BAR');
    expect(etichette(c)).toEqual(['C001 — Bar Centrale Srl']);
    c.scrivi('caffe citta');
    expect(etichette(c)).toEqual(['C002 — Caffè Città']);
  });

  it('also searches the hidden text and shows group titles only for groups with results', () => {
    const { c } = crea(opzioni);
    c.apri();
    c.scrivi('0123456');
    expect(etichette(c)).toEqual(['M001 — Ristorante Da Gino']);
    expect(c.righe.filter(r => r.titolo !== undefined).map(r => r.titolo)).toEqual(['A mano']);
  });

  it('says so when nothing matches', () => {
    const { c } = crea(opzioni);
    c.apri();
    c.scrivi('zzz');
    expect(c.righe.length).toBe(0);
  });

  it('shows at most 100 rows and counts the rest', () => {
    const molte = Array.from({ length: 250 }, (_, i) => ({ value: i, label: `Articolo ${i}` }));
    const { c } = crea(molte);
    c.apri();
    expect(etichette(c).length).toBe(100);
    expect(c.oltre).toBe(150);
    c.scrivi('Articolo 24');
    expect(etichette(c).length).toBe(13); // ogni parola è cercata come parte del testo: 24, 124, 224 e 240-249
    expect(c.oltre).toBe(0);
  });

  it('chooses with the keyboard and reports the value', () => {
    const { c, scelti } = crea(opzioni);
    c.apri();
    c.tasto(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    c.tasto(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(scelti).toEqual([2]);
    expect(c.aperto).toBeFalse();
    expect(c.etichettaSelezionata).toBe('C002 — Caffè Città');
  });

  it('offers a fixed empty entry that clears the choice', () => {
    const { c, scelti } = crea(opzioni, 'Tutti i clienti');
    c.writeValue(1);
    c.apri();
    expect(c.righe[0].opzione!.label).toBe('Tutti i clienti');
    c.scegli(c.righe[0].opzione!);
    expect(scelti).toEqual([undefined]);
    expect(c.etichettaSelezionata).toBe('Tutti i clienti');
  });

  it('does not open when disabled', () => {
    const { c } = crea(opzioni);
    c.setDisabledState(true);
    c.apri();
    expect(c.aperto).toBeFalse();
  });
});
