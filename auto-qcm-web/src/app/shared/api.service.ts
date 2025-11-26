import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface QcmItem { id: string; question: string; choices: string[]; answer_index: number; skill?: string; explanation?: string; }
export interface QcmPayload { name?: string; items: QcmItem[]; difficulty?: string; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  generateQcm(skills: string[], count: number, name?: string, difficulty?: string) {
    return this.http.post<{ items: QcmItem[]; name?: string; difficulty?: string }>(`${this.base}/generate_qcm`, { skills, count, name, difficulty });
  }

  saveQcm(user_id: string, qcm: QcmPayload, score?: number) {
    return this.http.post<{ id: string }>(`${this.base}/save_qcm`, { user_id, qcm, score });
  }

  getHistory(user_id: string) {
    return this.http.get<Array<{ id: string; created_at: string; score: number | null; name?: string }>>(`${this.base}/history/${user_id}`);
  }

  getQcm(id: string) {
    return this.http.get<{ id: string; qcm: QcmPayload; score: number | null; user_id: string; created_at: string }>(`${this.base}/qcm/${id}`);
  }

  deleteQcm(id: string) {
    return this.http.delete<void>(`${this.base}/qcm/${id}`);
  }

  getUsageStats() {
    return this.http.get<{
      role: string;
      limit: number | null;
      total: number;
      per_model: { model: string; count: number }[];
    }>(`${this.base}/usage_stats`);
  }
}
