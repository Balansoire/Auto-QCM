import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { ApiService } from '../shared/api.service';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html'
})
export class ProfilePageComponent {
  usage$;

  constructor(private auth: AuthService, private api: ApiService) {
    this.usage$ = this.auth.session$.pipe(
      switchMap((session) => {
        if (!session) {
          return of(null);
        }
        return this.api.getUsageStats();
      })
    );
  }

  get session$() {
    return this.auth.session$;
  }
}
