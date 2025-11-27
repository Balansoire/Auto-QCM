import { TestAutoPageComponent } from './test-auto.component';

describe('TestAutoPageComponent (logic)', () => {
  let router: { navigateByUrl: jasmine.Spy };
  let api: { generateQcm: jasmine.Spy };
  let store: { setCurrent: jasmine.Spy };
  let comp: TestAutoPageComponent;

  beforeEach(() => {
    router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    } as any;

    api = {
      generateQcm: jasmine.createSpy('generateQcm'),
    } as any;

    store = {
      setCurrent: jasmine.createSpy('setCurrent'),
    } as any;

    comp = new TestAutoPageComponent(api as any, router as any, store as any);
  });

  it('parses skillsInput into trimmed array (F-TESTAUTO-001)', () => {
    api.generateQcm.and.returnValue({
      subscribe: () => {},
    } as any);

    comp.skillsInput = '  python ,  django, ,  fastapi  ';
    comp.count = 10;

    comp.onGenerate();

    const args = api.generateQcm.calls.mostRecent().args;
    expect(args[0]).toEqual(['python', 'django', 'fastapi']);
  });

  it('clamps count between 1 and 50 (F-TESTAUTO-002)', () => {
    api.generateQcm.and.returnValue({
      subscribe: () => {},
    } as any);

    comp.skillsInput = 'python';

    comp.count = -5;
    comp.onGenerate();
    expect(api.generateQcm.calls.mostRecent().args[1]).toBe(1);

    comp.count = 100;
    comp.onGenerate();
    expect(api.generateQcm.calls.mostRecent().args[1]).toBe(50);
  });

  it('stores generated QCM and navigates on success (F-TESTAUTO-003)', () => {
    const response = {
      name: 'Generated QCM',
      items: [
        { id: '1', question: 'Q1', choices: ['A', 'B', 'C', 'D'], answer_index: 0 },
      ],
    };

    api.generateQcm.and.callFake(() => ({
      subscribe: (observer: any) => {
        observer.next(response);
      },
    }));

    comp.skillsInput = 'python';
    comp.count = 3;

    comp.onGenerate();

    expect(comp.loading).toBeFalse();
    expect(comp.error).toBeNull();

    expect(store.setCurrent).toHaveBeenCalledTimes(1);
    const qcmArg = store.setCurrent.calls.mostRecent().args[0];
    expect(qcmArg).toEqual({ name: response.name, items: response.items });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/qcm', { state: { qcm: qcmArg } });
  });

  it('sets error and clears store on generation error (F-TESTAUTO-004)', () => {
    api.generateQcm.and.returnValue({
      subscribe: (observer: any) => {
        observer.error(new Error('fail'));
      },
    } as any);

    comp.skillsInput = 'python';
    comp.count = 3;

    comp.onGenerate();

    expect(comp.loading).toBeFalse();
    expect(comp.error).toBe('Erreur de génération');
    expect(store.setCurrent).toHaveBeenCalledWith(null);
  });
});
