import { HistoryPageComponent } from './history.component';

describe('HistoryPageComponent (logic)', () => {
  let api: { getHistory: jasmine.Spy; getQcm: jasmine.Spy; deleteQcm: jasmine.Spy };
  let auth: { userId: string | null };
  let router: { getCurrentNavigation: jasmine.Spy; navigateByUrl: jasmine.Spy };
  let store: { setCurrent: jasmine.Spy };
  let comp: HistoryPageComponent;

  beforeEach(() => {
    api = {
      getHistory: jasmine.createSpy('getHistory'),
      getQcm: jasmine.createSpy('getQcm'),
      deleteQcm: jasmine.createSpy('deleteQcm'),
    } as any;

    auth = {
      userId: 'user-123',
    } as any;

    router = {
      getCurrentNavigation: jasmine.createSpy('getCurrentNavigation').and.returnValue(null),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    } as any;

    store = {
      setCurrent: jasmine.createSpy('setCurrent'),
    } as any;

    comp = new HistoryPageComponent(api as any, auth as any, router as any, store as any);
  });

  it('sets error when no user (F-HISTORY-001)', () => {
    (auth as any).userId = null;

    comp.ngOnInit();

    expect(comp.error).toBe('Veuillez vous connecter.');
    expect(comp.loading).toBeFalse();
    expect(api.getHistory).not.toHaveBeenCalled();
  });

  it('loads history successfully (F-HISTORY-002)', () => {
    const items = [
      { id: '1', created_at: '2025-01-01', score: 10, name: 'Q1' },
      { id: '2', created_at: '2025-01-02', score: null, name: 'Q2' },
    ];

    api.getHistory.and.returnValue({
      subscribe: (observer: any) => {
        observer.next(items);
      },
    } as any);

    comp.ngOnInit();

    expect(api.getHistory).toHaveBeenCalledWith('user-123');
    expect(comp.loading).toBeFalse();
    expect(comp.error).toBeNull();
    expect(comp.items).toEqual(items);
  });

  it('sets error on history load failure (F-HISTORY-003)', () => {
    api.getHistory.and.returnValue({
      subscribe: (observer: any) => {
        observer.error(new Error('fail'));
      },
    } as any);

    comp.ngOnInit();

    expect(comp.loading).toBeFalse();
    expect(comp.error).toBe('Erreur de chargement');
  });

  it('opens a QCM and navigates to /qcm (F-HISTORY-004)', () => {
    const qcm = { name: 'Q1', items: [] };

    api.getQcm.and.returnValue({
      subscribe: (observer: any) => {
        observer.next({ qcm });
      },
    } as any);

    comp.open('abc');

    expect(api.getQcm).toHaveBeenCalledWith('abc');
    expect(store.setCurrent).toHaveBeenCalledWith(qcm);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/qcm', { state: { qcm } });
  });

  it('removes item from list after successful delete (F-HISTORY-005)', () => {
    comp.items = [
      { id: '1', created_at: '2025-01-01', score: 10, name: 'Q1' },
      { id: '2', created_at: '2025-01-02', score: null, name: 'Q2' },
    ];

    api.deleteQcm.and.returnValue({
      subscribe: (observer: any) => {
        observer.next({});
      },
    } as any);

    comp.remove('1');

    expect(api.deleteQcm).toHaveBeenCalledWith('1');
    expect(comp.items.length).toBe(1);
    expect(comp.items[0].id).toBe('2');
  });
});
