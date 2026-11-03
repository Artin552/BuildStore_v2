// Мои заказы: список с страницами, «Подробнее» в окне и отмена заказа в статусе pending.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { ORDERS_PER_PAGE, cancelOrder, fetchOrder, fetchOrders } from '../api/orders';
import type { OrderWithItems } from '../api/types';
import EmptyState from '../components/EmptyState';
import { CloseIcon } from '../components/Icons';
import ListingImage from '../components/ListingImage';
import Notice from '../components/Notice';
import Pagination from '../components/Pagination';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFetch } from '../hooks/useFetch';
import { formatDateTime, formatPrice } from '../utils/format';

// Сейчас сервер выставляет только pending и cancelled, остальные статусы появятся позже
const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждён',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

function OrderStatusBadge({ status }: { status: string }) {
  return <span className={`order-status ${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

// <dialog> — встроенное окно браузера: само закрывается по Escape и не пускает фокус наружу
function OrderDetailsDialog({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { state, reload } = useFetch((signal) => fetchOrder(orderId, signal), [orderId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="orderDialogTitle" onClose={onClose}>
      <button type="button" className="modal-close" aria-label="Закрыть" onClick={onClose}>
        <CloseIcon />
      </button>
      <h2 id="orderDialogTitle" className="filters-title">
        Заказ №{orderId}
      </h2>

      {state.status === 'loading' && <p className="text-muted">Загружаем…</p>}
      {state.status === 'error' && (
        <>
          <Notice kind="danger">{state.message}</Notice>
          <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>
            Повторить
          </button>
        </>
      )}
      {state.status === 'success' && (
        <>
          <p className="text-muted">{formatDateTime(state.data.created_at)}</p>
          <OrderStatusBadge status={state.data.status} />
          <div>
            {state.data.items.map((item) => (
              <div key={item.id} className="order-detail-item">
                <ListingImage className="order-detail-image" src={item.imagePath} alt="" />
                <div>
                  <div className="order-detail-title">{item.title ?? 'Товар удалён'}</div>
                  {item.category && <div className="text-muted">{item.category}</div>}
                  {item.description && <p className="card-description">{item.description}</p>}
                  <div>
                    {formatPrice(item.price_at_purchase)} × {item.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="order-total">Итого: {formatPrice(state.data.total)}</p>
        </>
      )}
    </dialog>
  );
}

interface OrderCardProps {
  order: OrderWithItems;
  cancelling: boolean;
  onDetails: () => void;
  onCancel: () => void;
}

function OrderCard({ order, cancelling, onDetails, onCancel }: OrderCardProps) {
  return (
    <article className="order-card">
      <div className="order-header">
        <div>
          <div className="order-number">Заказ №{order.id}</div>
          <div className="order-date">{formatDateTime(order.created_at)}</div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="order-items">
        {order.items.map((item) => (
          <div key={item.id} className="order-item-row">
            <div className="order-item-name">
              {item.title ?? 'Товар удалён'} × {item.quantity}
            </div>
            <div>{formatPrice(item.price_at_purchase)}</div>
          </div>
        ))}
      </div>

      <div className="order-footer">
        <div className="order-total">Итого: {formatPrice(order.total)}</div>
        <div className="order-actions">
          {order.status === 'pending' && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={cancelling} onClick={onCancel}>
              {cancelling ? 'Отменяем…' : 'Отменить'}
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={onDetails}>
            Подробнее
          </button>
        </div>
      </div>
    </article>
  );
}

export default function OrdersPage() {
  useDocumentTitle('Мои заказы');
  const [params, setParams] = useSearchParams();
  const pageParam = Number(params.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { state, reload } = useFetch((signal) => fetchOrders(page, signal), [page]);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const totalPages = state.status === 'success' ? Math.ceil(state.data.total / ORDERS_PER_PAGE) : 0;

  const goToPage = (nextPage: number, replace = false) => {
    setParams(nextPage > 1 ? { page: String(nextPage) } : {}, { replace });
    window.scrollTo(0, 0);
  };

  // Страница из адреса больше существующих: идём на последнюю
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) goToPage(totalPages, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  const handleCancel = async (orderId: number) => {
    if (!window.confirm(`Отменить заказ №${orderId}? Это действие нельзя отменить.`)) return;
    setCancellingId(orderId);
    setActionError('');
    try {
      await cancelOrder(orderId);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="container page-main orders-page">
      <h1 className="page-title">Мои заказы</h1>

      {actionError && <Notice kind="danger">{actionError}</Notice>}

      {state.status === 'loading' && <EmptyState title="Загружаем заказы…" />}
      {state.status === 'error' && (
        <EmptyState title="Не удалось загрузить заказы" description={state.message}>
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Повторить
          </button>
        </EmptyState>
      )}
      {state.status === 'success' && state.data.total === 0 && (
        <EmptyState title="У вас пока нет заказов">
          <Link to="/catalog" className="btn btn-primary">
            Перейти в каталог
          </Link>
        </EmptyState>
      )}
      {state.status === 'success' && state.data.total > 0 && (
        <>
          {state.data.items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              cancelling={cancellingId === order.id}
              onDetails={() => setDetailsId(order.id)}
              onCancel={() => void handleCancel(order.id)}
            />
          ))}
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}

      {detailsId !== null && <OrderDetailsDialog orderId={detailsId} onClose={() => setDetailsId(null)} />}
    </div>
  );
}
