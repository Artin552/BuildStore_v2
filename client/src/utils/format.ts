// Как показывать пользователю цены, даты и слова после чисел.

// Цена в базе — текст. Вернёт число или null, если там не число (например, «договорная»).
export function parsePrice(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined || price === '') return null;
  const value = Number(price);
  return Number.isFinite(value) ? value : null;
}

// 21900 → «21 900 ₽»
export function formatPrice(price: string | number | null | undefined): string {
  const value = parsePrice(price);
  return value === null ? 'Цена не указана' : `${value.toLocaleString('ru-RU')} ₽`;
}

// «3 ноября 2026 г.»
export function formatDate(timestamp: number): string {
  return new Date(Number(timestamp)).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}

// «3 ноября 2026 г. в 18:25»
export function formatDateTime(timestamp: number): string {
  return new Date(Number(timestamp)).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// plural(5, 'товар', 'товара', 'товаров') → «товаров»
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
