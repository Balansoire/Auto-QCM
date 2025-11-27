import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call POST /generate_qcm with expected payload', () => {
    const skills = ['python', 'typescript'];
    const count = 5;
    const name = 'Test QCM';
    const difficulty = 'entretien';

    service.generateQcm(skills, count, name, difficulty).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/generate_qcm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ skills, count, name, difficulty });

    req.flush({ items: [], name });
  });

  it('should call POST /save_qcm', () => {
    const user_id = 'user-123';
    const qcm = { name: 'Test', items: [] };
    const score = 10;

    service.saveQcm(user_id, qcm, score).subscribe(res => {
      expect(res).toEqual({ id: 'abc' });
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/save_qcm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ user_id, qcm, score });

    req.flush({ id: 'abc' });
  });

  it('should call GET /history/{user_id}', () => {
    const user_id = 'user-123';

    service.getHistory(user_id).subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('id-1');
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/history/${user_id}`);
    expect(req.request.method).toBe('GET');

    req.flush([{ id: 'id-1', created_at: '2024-01-01T00:00:00Z', score: 1 }]);
  });

  it('should call GET /qcm/{id}', () => {
    const id = 'qcm-1';

    service.getQcm(id).subscribe(res => {
      expect(res.id).toBe(id);
      expect(res.qcm).toBeTruthy();
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/qcm/${id}`);
    expect(req.request.method).toBe('GET');

    req.flush({ id, qcm: { name: 'Qcm', items: [] }, score: null, user_id: 'u', created_at: '2024-01-01T00:00:00Z' });
  });

  it('should call DELETE /qcm/{id}', () => {
    const id = 'qcm-1';

    service.deleteQcm(id).subscribe(() => {
      expect(true).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/qcm/${id}`);
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

  it('should call GET /usage_stats', () => {
    service.getUsageStats().subscribe(res => {
      expect(res.role).toBe('user');
    });

    const req = http.expectOne(`${environment.apiBaseUrl}/usage_stats`);
    expect(req.request.method).toBe('GET');

    req.flush({ role: 'user', limit: 10, total: 1, per_model: [] });
  });
});
