// Запросы админ-панели. Права на каждый из них всё равно проверяет сервер.
import { apiFetch, apiFetchBlob, apiFetchList } from './client';
import type { AdminListing, AdminSummary, AdminUser, Organization, UserRole } from './types';

export const ADMIN_PER_PAGE = 20;

// Собирает строку вида ?status=pending&page=2, пропуская пустые значения
function toQuery(values: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, String(value));
  }
  params.set('limit', String(ADMIN_PER_PAGE));
  return `?${params}`;
}

export function fetchSummary(signal?: AbortSignal): Promise<AdminSummary> {
  return apiFetch<AdminSummary>('/admin/summary', { signal });
}

// ---------- Заявки организаций ----------
export function fetchOrganizations(filters: { status: string; q: string; page: number }, signal?: AbortSignal) {
  return apiFetchList<Organization>(`/admin/organizations${toQuery(filters)}`, { signal });
}

export function reviewOrganization(id: number, decision: 'approve' | 'reject', reason = '') {
  return apiFetch<{ success: boolean }>(`/admin/organizations/${id}/review`, {
    method: 'POST',
    body: { decision, reason },
  });
}

// Открыть закрытый документ в новой вкладке. path приходит от сервера: /api/admin/documents/имя
export async function openDocument(path: string): Promise<void> {
  const blob = await apiFetchBlob(path.replace(/^\/api/, ''));
  const url = URL.createObjectURL(blob);

  // Браузер мог заблокировать новую вкладку: тогда просто скачиваем файл
  if (!window.open(url, '_blank')) {
    const link = document.createElement('a');
    link.href = url;
    link.download = path.split('/').pop() ?? 'document';
    link.click();
  }
  // Освобождаем память, когда документ уже открылся
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ---------- Объявления ----------
export function fetchAdminListings(filters: { status: string; page: number }, signal?: AbortSignal) {
  return apiFetchList<AdminListing>(`/admin/listings${toQuery(filters)}`, { signal });
}

export function moderateListing(id: number, action: 'remove' | 'restore', reason = '') {
  return apiFetch<{ success: boolean }>(`/admin/listings/${id}/moderate`, {
    method: 'POST',
    body: { action, reason },
  });
}

// ---------- Пользователи ----------
export function fetchUsers(filters: { type: string; status: string; q: string; page: number }, signal?: AbortSignal) {
  return apiFetchList<AdminUser>(`/admin/users${toQuery(filters)}`, { signal });
}

export function blockUser(id: number, block: boolean) {
  return apiFetch<{ success: boolean }>(`/admin/users/${id}/block`, { method: 'POST', body: { block } });
}

export function setUserRole(id: number, role: UserRole) {
  return apiFetch<{ success: boolean }>(`/admin/users/${id}/role`, { method: 'POST', body: { role } });
}
