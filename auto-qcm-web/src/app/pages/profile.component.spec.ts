import { of } from 'rxjs';
import { ProfilePageComponent } from './profile.component';

describe('ProfilePageComponent (logic)', () => {
  let auth: { session$: any };
  let api: { getUsageStats: jasmine.Spy };
  let comp: ProfilePageComponent;

  beforeEach(() => {
    api = {
      getUsageStats: jasmine.createSpy('getUsageStats'),
    } as any;
  });

  it('usage$ emits null when there is no session (F-PROFILE-001)', (done) => {
    auth = {
      session$: of(null),
    } as any;

    comp = new ProfilePageComponent(auth as any, api as any);

    const values: any[] = [];
    comp.usage$.subscribe({
      next: (v: any) => values.push(v),
      complete: () => {
        expect(values).toEqual([null]);
        expect(api.getUsageStats).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('usage$ calls ApiService.getUsageStats when session exists (F-PROFILE-002)', (done) => {
    const fakeUsage = { role: 'dev', total: 0, limit: null, per_model: [] };

    auth = {
      session$: of({ id: 'session-123' }),
    } as any;

    api.getUsageStats.and.returnValue(of(fakeUsage));

    comp = new ProfilePageComponent(auth as any, api as any);

    const values: any[] = [];
    comp.usage$.subscribe({
      next: (v: any) => values.push(v),
      complete: () => {
        expect(api.getUsageStats).toHaveBeenCalledTimes(1);
        expect(values).toEqual([fakeUsage]);
        done();
      },
    });
  });
});
