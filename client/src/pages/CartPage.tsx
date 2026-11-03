// Корзина и оформление заказа. Смотреть корзину можно всем, оформить заказ — только после входа.
import { useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { createOrder } from '../api/orders';
import type { CartItem, Order } from '../api/types';
import EmptyState from '../components/EmptyState';
import ListingImage from '../components/ListingImage';
import Notice from '../components/Notice';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice, parsePrice } from '../utils/format';

function CartRow({ item }: { item: CartItem }) {
  const { removeItem, updateQuantity } = useCart();
  const price = parsePrice(item.price);

  // Количество применяем, когда человек закончил ввод. Пустое или неверное значение игнорируем,
  // иначе случайно стёртая цифра удаляла бы товар из корзины.
  const commitQuantity = (event: FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const value = Math.trunc(Number(input.value));
    if (input.value !== '' && value >= 1) {
      const quantity = Math.min(value, 999);
      updateQuantity(item.id, quantity);
      input.value = String(quantity);
    } else {
      input.value = String(item.quantity);
    }
  };

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  return (
    <div className="cart-item">
      <ListingImage className="cart-item-image" src={item.imagePath} alt={item.title} />
      <div className="cart-item-info">
        <Link className="cart-item-title" to={`/product/${item.id}`}>
          {item.title}
        </Link>
        <div className="cart-item-price">{formatPrice(item.price)}</div>
        <div className="cart-item-quantity">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label={`Уменьшить количество: ${item.title}`}
            disabled={item.quantity <= 1}
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
          >
            −
          </button>
          {/* key: кнопки «−» и «+» меняют число, и поле показывает новое значение */}
          <input
            key={item.quantity}
            type="number"
            min="1"
            max="999"
            className="quantity-input input"
            aria-label={`Количество: ${item.title}`}
            defaultValue={item.quantity}
            onBlur={commitQuantity}
            onKeyDown={blurOnEnter}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label={`Увеличить количество: ${item.title}`}
            disabled={item.quantity >= 999}
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
          >
            +
          </button>
          {price !== null && <span className="text-muted">= {formatPrice(price * item.quantity)}</span>}
        </div>
      </div>
      <button
        type="button"
        className="cart-item-remove"
        onClick={() => {
          if (window.confirm(`Удалить «${item.title}» из корзины?`)) removeItem(item.id);
        }}
      >
        Удалить
      </button>
    </div>
  );
}

export default function CartPage() {
  useDocumentTitle('Корзина');
  const { items, count, total, clear } = useCart();
  const { status } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const handleCheckout = async () => {
    setSubmitting(true);
    setError('');
    try {
      const order = await createOrder(items);
      setPlacedOrder(order);
      clear();
    } catch (err) {
      // Корзину не очищаем: человек может исправить проблему и повторить
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="container page-main">
        <h1 className="page-title">Корзина</h1>
        <EmptyState
          title={`Заказ №${placedOrder.id} оформлен`}
          description={`Сумма: ${formatPrice(placedOrder.total)}. Статус заказа виден на странице «Мои заказы».`}
        >
          <Link to="/orders" className="btn btn-primary">
            Мои заказы
          </Link>
          <Link to="/catalog" className="btn btn-secondary">
            Продолжить покупки
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container page-main">
        <h1 className="page-title">Корзина</h1>
        <EmptyState title="Ваша корзина пуста">
          <Link to="/catalog" className="btn btn-primary">
            Перейти в каталог
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container page-main">
      <h1 className="page-title">Корзина</h1>

      {items.map((item) => (
        <CartRow key={item.id} item={item} />
      ))}

      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Товаров:</span>
          <span>{count}</span>
        </div>
        <div className="cart-summary-total">Итого: {formatPrice(total)}</div>
        <p className="text-muted cart-summary-note">Итоговую сумму пересчитает сервер по актуальным ценам.</p>

        {error && <Notice kind="danger">{error}</Notice>}

        {status === 'guest' ? (
          <>
            <Notice>Чтобы оформить заказ, войдите в аккаунт. Корзина сохранится.</Notice>
            <Link to="/login" state={{ from: '/cart' }} className="btn btn-primary cart-summary-action">
              Войти
            </Link>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary cart-summary-action"
            disabled={submitting || status === 'loading'}
            onClick={() => void handleCheckout()}
          >
            {submitting ? 'Оформляем…' : 'Оформить заказ'}
          </button>
        )}
        <Link to="/catalog" className="btn btn-secondary cart-summary-action">
          Продолжить покупки
        </Link>
      </div>
    </div>
  );
}
