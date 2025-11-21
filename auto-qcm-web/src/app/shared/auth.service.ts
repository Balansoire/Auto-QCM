import { Injectable } from '@angular/core';
import { supabase } from './supabase-client';
import { BehaviorSubject } from 'rxjs';
import { QcmStoreService } from './qcm-store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _session$ = new BehaviorSubject<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  session$ = this._session$.asObservable();

  constructor(private qcmStore: QcmStoreService) {
    this.bootstrap();
    supabase.auth.onAuthStateChange((_event: any, session: any) => {
      this._session$.next(session);
      if (!session) {
        this.qcmStore.setCurrent(null);
      }
    });
  }

  async bootstrap() {
    const { data } = await supabase.auth.getSession();
    this._session$.next(data.session);
  }

  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  }

  async signOut() {
    return supabase.auth.signOut();
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  get userId(): string | null {
    return this._session$.value?.user?.id ?? null;
  }
}
