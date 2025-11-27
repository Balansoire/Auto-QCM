import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotFoundPageComponent } from './not-found.component';
import { AuthService } from '../shared/auth.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('NotFoundPageComponent (template)', () => {
  function setup(session: any): HTMLElement {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, NotFoundPageComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            session$: of(session),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders 404 message and guest CTA when not logged in (F-NOTFOUND-001)', () => {
    const el = setup(null);

    expect(el.textContent).toContain('Erreur 404');
    expect(el.textContent).toContain('Page introuvable');
    expect(el.textContent).toContain('Aller à la page de connexion');
  });

  it('renders test CTA when logged in (F-NOTFOUND-001)', () => {
    const el = setup({ id: 'session-123' });

    expect(el.textContent).toContain('Erreur 404');
    expect(el.textContent).toContain('Page introuvable');
    expect(el.textContent).toContain('Retour au générateur de QCM');
  });
});
