import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../shared/api.service';
import { authGuard } from '../shared/auth.guard';
import { QcmStoreService } from '../shared/qcm-store.service';

@Component({
  selector: 'app-test-auto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-auto.component.html'
})
export class TestAutoPageComponent {
  skillsInput = '';
  count = 10;
  name = '';
  difficulty = 'entretien';
  loading = false;
  error: string | null = null;

  constructor(private api: ApiService, private router: Router, private qcmStore: QcmStoreService) {}

  onGenerate() {
    const skills = this.skillsInput.split(',').map(s => s.trim()).filter(Boolean);
    const count = Math.max(1, Math.min(50, this.count || 10));
    this.loading = true; this.error = null;
    this.api.generateQcm(skills, count, this.name || undefined, this.difficulty || 'entretien').subscribe({
      next: res => {
        this.loading = false;
        const qcm = { name: res.name, items: res.items };
        this.qcmStore.setCurrent(qcm);
        this.router.navigateByUrl('/qcm', { state: { qcm } });
      },
      error: err => {
        this.loading = false;
        this.error = 'Erreur de génération';
        this.qcmStore.setCurrent(null);
        console.error(err);
      }
    });
  }
}
