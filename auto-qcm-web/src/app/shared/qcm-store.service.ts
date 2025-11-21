import { Injectable } from '@angular/core';
import { QcmPayload } from './api.service';

@Injectable({ providedIn: 'root' })
export class QcmStoreService {
  private _current: QcmPayload | null = null;

  setCurrent(qcm: QcmPayload | null) {
    this._current = qcm;
  }

  getCurrent(): QcmPayload | null {
    return this._current;
  }
}
