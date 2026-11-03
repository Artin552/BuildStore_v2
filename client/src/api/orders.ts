// Запросы заказов. Цену сервер берёт из базы, поэтому отправляем только id и количество.
import { apiFetch, apiFetchList } from './client';
import type { CartItem, Order, OrderWithItems } from './types';

export const ORDERS_PER_PAGE = 10;

export function createOrder(items: CartItem[]): Promise<Order> {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: { items: items.map(({ id, quantity }) => ({ id, quantity })) },
  });
}

export function fetchOrders(page: number, signal?: AbortSignal) {
  return apiFetchList<OrderWithItems>(`/orders?page=${page}&limit=${ORDERS_PER_PAGE}`, { signal });
}

export function fetchOrder(id: number, signal?: AbortSignal): Promise<OrderWithItems> {
  return apiFetch<OrderWithItems>(`/orders/${id}`, { signal });
}

export function cancelOrder(id: number): Promise<{ success: boolean; status: string }> {
  return apiFetch(`/orders/${id}`, { method: 'PATCH', body: { status: 'cancelled' } });
}
