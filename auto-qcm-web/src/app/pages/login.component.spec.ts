import { LoginPageComponent } from './login.component';

describe('LoginPageComponent (logic)', () => {
  let auth: { signIn: jasmine.Spy };
  let router: { navigateByUrl: jasmine.Spy };
  let comp: LoginPageComponent;

  beforeEach(() => {
    auth = {
      signIn: jasmine.createSpy('signIn')
    } as any;
    router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl')
    } as any;
    comp = new LoginPageComponent(auth as any, router as any);
    comp.email = 'john@example.com';
    comp.password = 'secret';
  });

  it('onSubmit calls AuthService.signIn and navigates on success (F-LOGIN-001)', async () => {
    auth.signIn.and.returnValue(Promise.resolve({ error: null }));

    await comp.onSubmit();

    expect(auth.signIn).toHaveBeenCalledWith('john@example.com', 'secret');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/test');
    expect(comp.loading).toBeFalse();
    expect(comp.error).toBeNull();
  });

  it('onSubmit sets error message when AuthService.signIn fails (F-LOGIN-002)', async () => {
    const error = { message: 'Invalid credentials' } as any;
    auth.signIn.and.returnValue(Promise.resolve({ error }));

    await comp.onSubmit();

    expect(auth.signIn).toHaveBeenCalledWith('john@example.com', 'secret');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(comp.error).toBe('Invalid credentials');
    expect(comp.loading).toBeFalse();
  });

  it('loading flag is true during submit then false afterwards (F-LOGIN-003)', async () => {
    let resolveFn: ((value: any) => void) | undefined;
    auth.signIn.and.returnValue(new Promise(res => { resolveFn = res; }));

    const promise = comp.onSubmit();

    expect(comp.loading).toBeTrue();

    resolveFn && resolveFn({ error: null });
    await promise;

    expect(comp.loading).toBeFalse();
  });
});
