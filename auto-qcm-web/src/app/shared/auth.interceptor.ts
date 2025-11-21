import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { supabase } from './supabase-client';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);
  return from(supabase.auth.getSession()).pipe(
    switchMap((res: any) => {
      const { data } = res;
      const token = data?.session?.access_token;
      const headers = token
        ? req.headers.set('Authorization', `Bearer ${token}`)
        : req.headers;

      return next(req.clone({ headers }));
    })
  );
};
