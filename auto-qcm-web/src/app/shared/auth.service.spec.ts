import { AuthService } from './auth.service';
import { QcmStoreService } from './qcm-store.service';
import { supabase } from './supabase-client';

describe('AuthService', () => {
  let qcmStore: jasmine.SpyObj<QcmStoreService>;

  beforeEach(() => {
    qcmStore = jasmine.createSpyObj<QcmStoreService>('QcmStoreService', ['setCurrent']);
  });

  it('bootstrap sets session and exposes userId (F-AUTH-001, F-AUTH-006)', async () => {
    const session: any = { user: { id: 'user-1' } };
    spyOn(supabase.auth, 'onAuthStateChange').and.returnValue({} as any);
    spyOn(supabase.auth, 'getSession').and.resolveTo({ data: { session } } as any);

    const service = new AuthService(qcmStore);
    await service.bootstrap();

    expect(service.userId).toBe('user-1');
  });

  it('signIn delegates to supabase.auth.signInWithPassword (F-AUTH-002)', async () => {
    const spy = spyOn(supabase.auth, 'signInWithPassword').and.resolveTo({ data: {}, error: null } as any);
    const service = new AuthService(qcmStore);

    await service.signIn('a@example.com', 'pwd');

    expect(spy).toHaveBeenCalledWith({ email: 'a@example.com', password: 'pwd' });
  });

  it('signUp delegates to supabase.auth.signUp (F-AUTH-003)', async () => {
    const spy = spyOn(supabase.auth, 'signUp').and.resolveTo({ data: {}, error: null } as any);
    const service = new AuthService(qcmStore);

    await service.signUp('b@example.com', 'pwd');

    expect(spy).toHaveBeenCalledWith({ email: 'b@example.com', password: 'pwd' });
  });

  it('signOut delegates to supabase.auth.signOut and clears QCM on logout event (F-AUTH-004)', async () => {
    const onAuthSpy = spyOn(supabase.auth, 'onAuthStateChange').and.callFake((cb: any) => {
      cb('SIGNED_OUT', null);
      return {} as any;
    });
    const signOutSpy = spyOn(supabase.auth, 'signOut').and.resolveTo({} as any);

    const service = new AuthService(qcmStore);

    await service.signOut();

    expect(signOutSpy).toHaveBeenCalled();
    expect(onAuthSpy).toHaveBeenCalled();
    expect(qcmStore.setCurrent).toHaveBeenCalledWith(null);
  });

  it('getAccessToken returns token or null (F-AUTH-005)', async () => {
    spyOn(supabase.auth, 'onAuthStateChange').and.returnValue({} as any);
    const getSessionSpy = spyOn(supabase.auth, 'getSession').and.resolveTo({ data: { session: { access_token: 'tok' } } } as any);

    const service = new AuthService(qcmStore);
    const token = await service.getAccessToken();

    expect(getSessionSpy).toHaveBeenCalled();
    expect(token).toBe('tok');
  });
});
