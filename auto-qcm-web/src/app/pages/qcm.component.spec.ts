import { QcmPageComponent } from './qcm.component';
import { QcmPayload } from '../shared/api.service';

describe('QcmPageComponent (logic)', () => {
  let router: { navigateByUrl: jasmine.Spy };
  let api: { saveQcm: jasmine.Spy };
  let auth: { userId: string | null };
  let store: { getCurrent: jasmine.Spy; setCurrent: jasmine.Spy };
  let comp: QcmPageComponent;

  const makeQcm = (): QcmPayload => ({
    name: 'Test QCM',
    items: [
      { id: '1', question: 'Q1', choices: ['A', 'B', 'C', 'D'], answer_index: 1 },
      { id: '2', question: 'Q2', choices: ['A', 'B', 'C', 'D'], answer_index: 2 },
      { id: '3', question: 'Q3', choices: ['A', 'B', 'C', 'D'], answer_index: 0 },
    ],
  });

  beforeEach(() => {
    router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    } as any;

    api = {
      saveQcm: jasmine.createSpy('saveQcm'),
    } as any;

    auth = {
      userId: 'user-123',
    } as any;

    store = {
      getCurrent: jasmine.createSpy('getCurrent'),
      setCurrent: jasmine.createSpy('setCurrent'),
    } as any;

    comp = new QcmPageComponent(router as any, api as any, auth as any, store as any);
  });

  it('should compute score correctly on submit', () => {
    const qcm = makeQcm();
    comp.qcm = qcm;

    comp.select(0, 1);
    comp.select(1, 2);
    comp.select(2, 3);

    comp.submit();

    expect(comp.submitted).toBeTrue();
    expect(comp.score).toBe(2);
  });

  it('should not submit when qcm is null', () => {
    comp.qcm = null;
    comp.submit();
    expect(comp.submitted).toBeFalse();
    expect(comp.score).toBe(0);
  });

  it('should set error when saving without user', async () => {
    const qcm = makeQcm();
    comp.qcm = qcm;
    (auth as any).userId = null;

    await comp.save();

    expect(comp.error).toBe('Veuillez vous connecter.');
    expect(api.saveQcm).not.toHaveBeenCalled();
  });

  it('should call api.saveQcm and navigate on successful save', async () => {
    const qcm = makeQcm();
    comp.qcm = qcm;
    comp.submitted = true;
    comp.score = 2;

    api.saveQcm.and.returnValue({
      toPromise: () => Promise.resolve({ id: 'saved-id' }),
    });

    await comp.save();

    expect(api.saveQcm).toHaveBeenCalledWith('user-123', qcm, 2);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/history', { state: { justSaved: true } });
    expect(comp.saving).toBeFalse();
    expect(comp.error).toBeNull();
  });

  it('should generate export filename following convention (F-QCM-005)', () => {
    const qcm = makeQcm();
    comp.qcm = qcm;

    const fakeLink: any = {
      click: jasmine.createSpy('click'),
      href: '',
      download: '',
    };

    spyOn(document as any, 'createElement').and.returnValue(fakeLink);
    spyOn(URL as any, 'createObjectURL').and.returnValue('blob:mock');
    spyOn(URL as any, 'revokeObjectURL');

    spyOn(Date.prototype as any, 'toISOString').and.returnValue('2025-01-02T12:34:56.000Z');

    comp.exportJson();

    expect(fakeLink.download).toBe('qcm-test-qcm-2025-01-02.json');
    expect(fakeLink.click).toHaveBeenCalled();
  });
});
