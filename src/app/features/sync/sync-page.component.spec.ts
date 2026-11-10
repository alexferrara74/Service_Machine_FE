import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SyncPageComponent } from './sync-page.component';

describe('SyncPageComponent', () => {
  let http: HttpTestingController;

  function create() {
    const fixture = TestBed.createComponent(SyncPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts to the ERP sync endpoint and shows the statistics', async () => {
    const fixture = create();
    const pending = fixture.componentInstance.sync();

    const request = http.expectOne('/api/sync/erp');
    expect(request.request.method).toBe('POST');
    request.flush({
      status: 'success',
      message: 'Sincronizzazione completata.',
      details: {
        statistiche: {
          clienti: 105, prodottiCatalogo: 1014, attrezzature: 190, accessori: 314,
          classiSottoclassi: 178, righeFattura: 1013, clientiConProdottiFatturati: 68,
        },
      },
    });
    await pending;
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(text).toContain('Sincronizzazione completata.');
    expect(text).toContain('Clienti: 105');
    expect(text).toContain('Classi e sottoclassi: 178');
    expect(text).not.toContain('Righe noleggio');
  });

  it('shows the message sent by the backend when the sync fails', async () => {
    const fixture = create();
    const pending = fixture.componentInstance.sync();

    http.expectOne('/api/sync/erp').flush(
      { status: 502, message: 'Servizio di sincronizzazione ERP non raggiungibile' },
      { status: 502, statusText: 'Bad Gateway' }
    );
    await pending;
    fixture.detectChanges();

    expect(fixture.componentInstance.error).toBe('Servizio di sincronizzazione ERP non raggiungibile');
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(fixture.componentInstance.statistics).toBeUndefined();
  });

  it('disables the button while a sync is running', () => {
    const fixture = create();
    void fixture.componentInstance.sync();
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
    http.expectOne('/api/sync/erp').flush({ status: 'success', message: '' });
  });
});
