// Страница товара: фото, цена, продавец, сертификат или предупреждение, «В корзину».
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchListing } from '../api/listings';
import type { Listing } from '../api/types';
import EmptyState from '../components/EmptyState';
import ListingImage from '../components/ListingImage';
import Notice from '../components/Notice';
import SellerBadges from '../components/SellerBadges';
import { useCart } from '../context/CartContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFetch } from '../hooks/useFetch';
import { formatDate, formatPrice, parsePrice } from '../utils/format';

// Адрес вводит пользователь, а на нечисловой id сервер ответил бы ошибкой базы
function isValidId(id: string | undefined): id is string {
  return id !== undefined && /^[1-9]\d{0,8}$/.test(id);
}

function CertificateNotice({ listing }: { listing: Listing }) {
  if (listing.sellerType !== 'organization') return null;
  if (listing.certificatePath) {
    return (
      <Notice kind="success">
        <strong>Продавец приложил сертификат или паспорт товара.</strong>
        <a href={listing.certificatePath} target="_blank" rel="noopener noreferrer">
          Открыть документ
        </a>
      </Notice>
    );
  }
  return (
    <Notice kind="warning">
      <strong>Внимание: продавец не предоставил сертификат или паспорт на этот товар.</strong> Перед покупкой запросите
      документы у продавца.
    </Notice>
  );
}

function ProductDetails({ listing }: { listing: Listing }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const removed = listing.moderation_status === 'removed';
  const outOfStock = listing.in_stock === 0;
  const noPrice = parsePrice(listing.price) === null;
  const canBuy = !removed && !outOfStock && !noPrice;

  return (
    <article className="product-detail">
      <div className="product-media">
        <ListingImage className="product-image" src={listing.imagePath} alt={listing.title} lazy={false} />
      </div>

      <div className="product-info">
        <h1 className="product-title">{listing.title}</h1>
        <div className="text-muted">
          {listing.category}
          {listing.created_at ? ` · размещено ${formatDate(listing.created_at)}` : ''}
        </div>

        {removed && (
          <Notice kind="danger">
            <strong>Объявление снято модератором.</strong>
            {listing.removal_reason ? ` Причина: ${listing.removal_reason}` : ''}
          </Notice>
        )}

        <div className="product-price">{formatPrice(listing.price)}</div>
        <div className="card-meta">
          {listing.discount > 0 && <span className="badge badge-warning">−{listing.discount}%</span>}
          {outOfStock ? (
            <span className="badge badge-out-of-stock">Нет в наличии</span>
          ) : (
            <span className="badge badge-stock">В наличии</span>
          )}
        </div>

        <SellerBadges listing={listing} />
        <CertificateNotice listing={listing} />

        <p className="product-description">{listing.description || 'Описание не указано'}</p>

        <div className="product-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canBuy}
            onClick={() => {
              addItem(listing);
              setAdded(true);
            }}
          >
            {outOfStock ? 'Нет в наличии' : 'Добавить в корзину'}
          </button>
          <Link to={`/catalog?category=${encodeURIComponent(listing.category)}`} className="btn btn-secondary">
            Назад в каталог
          </Link>
        </div>

        {noPrice && <p className="text-muted">Цена не указана, поэтому товар нельзя заказать через сайт.</p>}
        {added && (
          <Notice kind="success">
            Товар добавлен.
            <Link to="/cart">Перейти в корзину</Link>
          </Notice>
        )}
      </div>
    </article>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const validId = isValidId(id);

  const { state, reload } = useFetch(
    (signal) => (isValidId(id) ? fetchListing(id, signal) : Promise.reject(new Error('Товар не найден'))),
    [id],
  );

  useDocumentTitle(state.status === 'success' ? state.data.title : 'Товар');

  return (
    <div className="container page-main">
      {state.status === 'loading' && <EmptyState title="Загружаем товар…" />}
      {state.status === 'error' &&
        (!validId || state.code === 404 ? (
          <EmptyState title="Товар не найден или снят с публикации">
            <Link to="/catalog" className="btn btn-primary">
              Вернуться в каталог
            </Link>
          </EmptyState>
        ) : (
          <EmptyState title="Не удалось загрузить товар" description={state.message}>
            <button type="button" className="btn btn-secondary" onClick={reload}>
              Повторить
            </button>
          </EmptyState>
        ))}
      {/* key: на другом товаре сообщение «Товар добавлен» не должно оставаться */}
      {state.status === 'success' && <ProductDetails key={state.data.id} listing={state.data} />}
    </div>
  );
}
