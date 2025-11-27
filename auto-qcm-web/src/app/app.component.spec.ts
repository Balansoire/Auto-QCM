import { AppComponent } from './app.component';

describe('AppComponent (logic)', () => {
  let auth: any;
  let router: any;
  let component: AppComponent;

  beforeEach(() => {
    auth = {
      session$: null,
      signOut: jasmine.createSpy('signOut')
    };
    router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl')
    };
    component = new AppComponent(auth, router);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('getDisplayName should derive name from email when present', () => {
    const session = { user: { email: 'john.doe@example.com' } };
    expect(component.getDisplayName(session)).toBe('john.doe');
  });

  it('getDisplayName should return "Compte" when email is missing', () => {
    const session = { user: {} };
    expect(component.getDisplayName(session)).toBe('Compte');
    expect(component.getDisplayName(null as any)).toBe('Compte');
  });

  it('getInitials should return two letters from display name', () => {
    const session = { user: { email: 'john_doe@example.com' } };
    const initials = component.getInitials(session);
    expect(initials.length).toBe(2);
  });

  it('logout should call auth.signOut and navigate to /login', async () => {
    await component.logout();
    expect(auth.signOut).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
