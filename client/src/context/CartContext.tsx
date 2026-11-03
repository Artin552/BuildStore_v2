// Корзина в localStorage. Ключ и формат те же, что в старом frontend/js/cart.js,
// поэтому корзина пользователя не пропадёт при переходе на React.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartItem, Listing } from '../api/types';

const CART_KEY = 'buildstore_cart';
const MAX_QUANTITY = 999; // такой же предел у сервера в POST /api/orders

function clampQuantity(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

// В localStorage может лежать что угодно: старые данные или правки вручную. Берём только корректное.
function toCartItem(value: unknown): CartItem | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const id = Number(raw.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const quantity = Number(raw.quantity);
  return {
    id,
    title: String(raw.title ?? ''),
    price: String(raw.price ?? ''),
    imagePath: String(raw.imagePath ?? ''),
    quantity: Number.isFinite(quantity) ? clampQuantity(quantity) : 1,
  };
}

function parseCart(json: string | null): CartItem[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toCartItem).filter((item) => item !== null);
  } catch {
    return [];
  }
}

function readCart(): CartItem[] {
  try {
    return parseCart(localStorage.getItem(CART_KEY));
  } catch {
    return [];
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number; // сколько единиц товара всего (для значка в шапке)
  total: number; // предварительная сумма; настоящую считает сервер при оформлении заказа
  addItem: (listing: Pick<Listing, 'id' | 'title' | 'price' | 'imagePath'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);

  // Сохраняем при каждом изменении. Одинаковое значение повторно не пишем.
  useEffect(() => {
    try {
      const json = JSON.stringify(items);
      if (localStorage.getItem(CART_KEY) !== json) localStorage.setItem(CART_KEY, json);
    } catch {
      // Хранилище недоступно: корзина проживёт до перезагрузки страницы
    }
  }, [items]);

  // Корзину изменили в другой вкладке. Без этого старая копия здесь затёрла бы новые данные.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_KEY || event.key === null) setItems(parseCart(event.key ? event.newValue : null));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0),
      addItem: (listing) =>
        setItems((current) => {
          const exists = current.some((item) => item.id === listing.id);
          if (exists) {
            return current.map((item) =>
              item.id === listing.id ? { ...item, quantity: clampQuantity(item.quantity + 1) } : item,
            );
          }
          const { id, title, price, imagePath } = listing;
          return [...current, { id, title, price, imagePath, quantity: 1 }];
        }),
      removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
      updateQuantity: (id, quantity) => {
        if (!Number.isFinite(quantity)) return;
        setItems((current) =>
          quantity < 1
            ? current.filter((item) => item.id !== id)
            : current.map((item) => (item.id === id ? { ...item, quantity: clampQuantity(quantity) } : item)),
        );
      },
      clear: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart можно вызывать только внутри CartProvider');
  return context;
}
