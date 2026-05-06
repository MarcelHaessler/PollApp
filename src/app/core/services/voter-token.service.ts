import { Injectable } from '@angular/core';

const STORAGE_KEY = 'pollapp.voter_token';

@Injectable({ providedIn: 'root' })
export class VoterTokenService {
  get token(): string {
    let token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  }
}
