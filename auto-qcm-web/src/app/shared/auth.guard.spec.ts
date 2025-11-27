import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { supabase } from './supabase-client';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            createUrlTree: jasmine.createSpy('createUrlTree')
          }
        }
      ]
    });
  });

  it('allows navigation when Supabase returns a session (F-GUARD-001)', async () => {
    spyOn(supabase.auth, 'getSession').and.resolveTo({ data: { session: {} }, error: null } as any);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/some-url' } as RouterStateSnapshot;

    const result = await TestBed.runInInjectionContext(() => authGuard(route, state) as any);

    expect(result).toBeTrue();
  });

  it('redirects to /login when there is no session (F-GUARD-002)', async () => {
    const router = TestBed.inject(Router);
    const createUrlTreeSpy = router.createUrlTree as jasmine.Spy;
    createUrlTreeSpy.and.returnValue({} as any);

    spyOn(supabase.auth, 'getSession').and.resolveTo({ data: { session: null }, error: null } as any);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/some-url' } as RouterStateSnapshot;

    const result = await TestBed.runInInjectionContext(() => authGuard(route, state) as any);

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(createUrlTreeSpy.calls.mostRecent().returnValue);
  });
});

