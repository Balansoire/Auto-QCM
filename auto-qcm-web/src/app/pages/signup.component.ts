import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html'
})
export class SignupPageComponent {
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit() {
    this.loading = true; this.error = null;
    const { error } = await this.auth.signUp(this.email, this.password);
    this.loading = false;
    if (error) { this.error = error.message; return; }
    this.router.navigateByUrl('/test');
  }
}
