import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.component.html'
})
export class NotFoundPageComponent {
  constructor(private auth: AuthService) {}

  get session$() {
    return this.auth.session$;
  }
}
