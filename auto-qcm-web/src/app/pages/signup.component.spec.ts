import { SignupPageComponent } from './signup.component';

describe('SignupPageComponent (logic)', () => {
  let auth: { signUp: jasmine.Spy };
  let router: { navigateByUrl: jasmine.Spy };
  let comp: SignupPageComponent;

  beforeEach(() => {
    auth = {
      signUp: jasmine.createSpy('signUp')
    } as any;
    router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl')
    } as any;
    comp = new SignupPageComponent(auth as any, router as any);
    comp.email = 'new@example.com';
    comp.password = 'secret';
  });

  it('onSubmit calls AuthService.signUp and navigates on success (F-SIGNUP-001)', async () => {
    auth.signUp.and.returnValue(Promise.resolve({ error: null }));

    await comp.onSubmit();

    expect(auth.signUp).toHaveBeenCalledWith('new@example.com', 'secret');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/test');
    expect(comp.loading).toBeFalse();
    expect(comp.error).toBeNull();
  });

  it('onSubmit sets error message when AuthService.signUp fails (F-SIGNUP-002)', async () => {
    const error = { message: 'Email already used' } as any;
    auth.signUp.and.returnValue(Promise.resolve({ error }));

    await comp.onSubmit();

    expect(auth.signUp).toHaveBeenCalledWith('new@example.com', 'secret');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(comp.error).toBe('Email already used');
    expect(comp.loading).toBeFalse();
  });

  it('loading flag is true during submit then false afterwards (F-SIGNUP-003)', async () => {
    let resolveFn: ((value: any) => void) | undefined;
    auth.signUp.and.returnValue(new Promise(res => { resolveFn = res; }));

    const promise = comp.onSubmit();

    expect(comp.loading).toBeTrue();

    resolveFn && resolveFn({ error: null });
    await promise;

    expect(comp.loading).toBeFalse();
  });
});

