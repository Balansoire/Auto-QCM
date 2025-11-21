import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase } from './supabase-client';

export const authGuard: CanActivateFn = async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  return inject(Router).createUrlTree(['/login']);
};
