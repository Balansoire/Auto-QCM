import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MarkdownComponent } from 'ngx-markdown';
import { ApiService, QcmItem, QcmPayload } from '../shared/api.service';
import { AuthService } from '../shared/auth.service';
import { QcmStoreService } from '../shared/qcm-store.service';

@Component({
  selector: 'app-qcm-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MarkdownComponent],
  templateUrl: './qcm.component.html'
})
export class QcmPageComponent implements OnInit {
  qcm: QcmPayload | null = null;
  selected: Record<number, number> = {};
  submitted = false;
  score = 0;
  saving = false;
  error: string | null = null;

  constructor(private router: Router, private api: ApiService, private auth: AuthService, private qcmStore: QcmStoreService) {}

  ngOnInit(): void {
    // First try to read from the shared store (robust to reloads), then fall back to navigation state
    this.qcm = this.qcmStore.getCurrent();
    if (!this.qcm) {
      const nav = this.router.getCurrentNavigation();
      const state = nav?.extras?.state as any;
      this.qcm = state?.qcm || null;
      if (this.qcm) {
        this.qcmStore.setCurrent(this.qcm);
      }
    }
  }

  select(i: number, j: number) {
    this.selected[i] = j;
  }

  isCorrect(i: number) {
    if (!this.qcm) return false;
    const ans = this.qcm.items[i].answer_index;
    return this.selected[i] === ans;
  }

  submit() {
    if (!this.qcm) return;
    this.submitted = true;
    this.score = this.qcm.items.reduce((acc, _it, i) => acc + (this.isCorrect(i) ? 1 : 0), 0);
  }

  exportJson() {
    if (!this.qcm) return;
    const name = (this.qcm.name || 'qcm').replace(/\s+/g, '-').toLowerCase();
    const data = JSON.stringify(this.qcm, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    a.download = `qcm-${name}-${date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async save() {
    if (!this.qcm) return;
    const userId = this.auth.userId;
    if (!userId) { this.error = 'Veuillez vous connecter.'; return; }
    this.saving = true; this.error = null;
    try {
      const res = await this.api.saveQcm(userId, this.qcm, this.submitted ? this.score : undefined).toPromise();
      this.saving = false;
      if (!res) return;
      this.router.navigateByUrl('/history', { state: { justSaved: true } });
    } catch (e) {
      this.saving = false; this.error = 'Erreur de sauvegarde'; console.error(e);
    }
  }
}
