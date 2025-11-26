import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase } from './supabase-client';

export const authGuard: CanActivateFn = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(error);
      return inject(Router).createUrlTree(['/login']);
    }
    if (data.session) return true;
    return inject(Router).createUrlTree(['/login']);
  } catch (e) {
    console.error(e);
    return inject(Router).createUrlTree(['/login']);
  }
};
