import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
      throw new Error(
        'Supabase ist nicht konfiguriert. Bitte supabaseUrl und supabaseAnonKey ' +
          'in src/environments/environment.ts eintragen.'
      );
    }
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }
}
