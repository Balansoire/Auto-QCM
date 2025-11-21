import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

let supabase: any;
if (environment.devNoAuth) {
  const fakeAuth = {
    async getSession() { return { data: { session: null } }; },
    async signInWithPassword() { return { data: null, error: { message: 'Auth disabled in devNoAuth' } }; },
    async signUp() { return { data: null, error: { message: 'Auth disabled in devNoAuth' } }; },
    async signOut() { return { error: null }; },
    onAuthStateChange(_cb: any) { return { data: { subscription: { unsubscribe() {} } } }; },
  };
  supabase = { auth: fakeAuth };
} else {
  supabase = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey
  );
}
export { supabase };
