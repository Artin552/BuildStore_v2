// Запросы аккаунта. Сейчас здесь то, что нужно AuthContext; регистрация и сброс пароля появятся на шаге 3.
import { apiFetch } from './client';
import type { AuthResponse, Me } from './types';

export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return apiFetch<Me>('/auth/me', { signal });
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });
}
