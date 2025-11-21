import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { AuthService } from '../shared/auth.service';
import { QcmStoreService } from '../shared/qcm-store.service';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html'
})
export class HistoryPageComponent implements OnInit {
  items: Array<{ id: string; created_at: string; score: number | null; name?: string }> = [];
  loading = false;
  error: string | null = null;
  justSaved = false;

  constructor(private api: ApiService, private auth: AuthService, private router: Router, private qcmStore: QcmStoreService) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as any;
    if (state?.justSaved) {
      this.justSaved = true;
    }

    const uid = this.auth.userId;
    if (!uid) { this.error = 'Veuillez vous connecter.'; return; }
    this.loading = true;
    this.api.getHistory(uid).subscribe({
      next: res => { this.items = res; this.loading = false; },
      error: err => { this.error = 'Erreur de chargement'; this.loading = false; console.error(err); }
    });
  }

  open(id: string) {
    this.api.getQcm(id).subscribe({
      next: res => {
        const qcm = res.qcm;
        this.qcmStore.setCurrent(qcm);
        this.router.navigateByUrl('/qcm', { state: { qcm } });
      }
    });
  }

  remove(id: string) {
    this.api.deleteQcm(id).subscribe({
      next: () => {
        this.items = this.items.filter(x => x.id !== id);
      }
    });
  }
}
