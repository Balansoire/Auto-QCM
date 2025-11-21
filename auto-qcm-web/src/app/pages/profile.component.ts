import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html'
})
export class ProfilePageComponent {
  constructor(private auth: AuthService) {}

  get session$() {
    return this.auth.session$;
  }
}
