import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login.component';
import { SignupPageComponent } from './pages/signup.component';
import { TestAutoPageComponent } from './pages/test-auto.component';
import { QcmPageComponent } from './pages/qcm.component';
import { HistoryPageComponent } from './pages/history.component';
import { ProfilePageComponent } from './pages/profile.component';
import { NotFoundPageComponent } from './pages/not-found.component';
import { authGuard } from './shared/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'test' },
  { path: 'login', component: LoginPageComponent },
  { path: 'signup', component: SignupPageComponent },
  { path: 'test', component: TestAutoPageComponent, canActivate: [authGuard] },
  { path: 'qcm', component: QcmPageComponent, canActivate: [authGuard] },
  { path: 'history', component: HistoryPageComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
  { path: '**', component: NotFoundPageComponent }
];

