import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './shared/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}

  get session$() {
    return this.auth.session$;
  }

  getDisplayName(session: any): string {
    const email = session?.user?.email as string | undefined;
    if (!email) return 'Compte';
    const name = email.split('@')[0];
    return name || 'Compte';
  }

  getInitials(session: any): string {
    const base = this.getDisplayName(session).trim();
    if (!base) return '?';
    const parts = base.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/login');
  }
}
