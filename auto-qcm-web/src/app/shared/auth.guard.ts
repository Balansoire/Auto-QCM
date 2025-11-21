import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase } from './supabase-client';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = async () => {
  if (environment.devNoAuth) return true;
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  return inject(Router).createUrlTree(['/login']);
};
