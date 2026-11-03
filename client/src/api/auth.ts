// Запросы аккаунта.
import { UPLOAD_TIMEOUT_MS, apiFetch } from './client';
import type { AuthResponse, Me, RegisterRequest } from './types';

export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return apiFetch<Me>('/auth/me', { signal });
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });
}

export function registerRequest(data: RegisterRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: data, timeoutMs: UPLOAD_TIMEOUT_MS });
}

export function forgotRequest(email: string): Promise<{ message: string }> {
  return apiFetch('/auth/forgot', { method: 'POST', body: { email } });
}

export function resetRequest(token: string, password: string): Promise<{ message: string }> {
  return apiFetch('/auth/reset', { method: 'POST', body: { token, password } });
}

export function uploadAvatar(imageBase64: string): Promise<{ avatarPath: string }> {
  return apiFetch('/auth/avatar', { method: 'POST', body: { imageBase64 }, timeoutMs: UPLOAD_TIMEOUT_MS });
}
