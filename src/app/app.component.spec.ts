import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { ApiConfiguration } from './api/api-configuration';
import { AuthService, Ruolo } from './core/auth.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiConfiguration, useValue: { rootUrl: '' } },
      ],
    }).compileComponents();
  });

  function loginAs(ruolo: Ruolo): void {
    TestBed.inject(AuthService).sessione.set({
      token: 't', username: 'tester', ruolo, scadenza: new Date(Date.now() + 3600_000).toISOString(),
    });
  }

  function links(): string[] {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a.nav-link')).map(l => l.getAttribute('href') ?? '');
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have the 'Servizi Pilot' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.title).toEqual('Servizi Pilot');
  });

  it('shows no navigation to someone who is not logged in', () => {
    expect(links()).toEqual([]);
  });

  it('shows an admin every section, including sync and users', () => {
    loginAs('ADMIN');
    const found = links();
    expect(found).toContain('/sync');
    expect(found).toContain('/utenti');
    expect(found).toContain('/registro');
    expect(found).toContain('/clienti');
  });

  it('hides the administration sections from a viewer', () => {
    loginAs('VIEWER');
    const found = links();
    expect(found).toContain('/clienti');
    expect(found).not.toContain('/sync');
    expect(found).not.toContain('/utenti');
    expect(found).not.toContain('/registro');
  });
});
