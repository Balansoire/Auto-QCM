import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase } from './supabase-client';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(error);
      return router.createUrlTree(['/login']);
    }
    if (data.session) return true;
    return router.createUrlTree(['/login']);
  } catch (e) {
    console.error(e);
    return router.createUrlTree(['/login']);
  }
};
