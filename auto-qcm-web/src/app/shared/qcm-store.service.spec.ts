import { QcmStoreService } from './qcm-store.service';

describe('QcmStoreService', () => {
  it('should store and retrieve current QCM', () => {
    const store = new QcmStoreService();
    const qcm: any = { name: 'Test', items: [] };

    expect(store.getCurrent()).toBeNull();
    store.setCurrent(qcm);
    expect(store.getCurrent()).toBe(qcm);

    store.setCurrent(null);
    expect(store.getCurrent()).toBeNull();
  });
});
