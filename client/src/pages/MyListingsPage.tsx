// Мои объявления: статус модерации, причина снятия, редактирование, удаление.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { deleteListing, fetchListings } from '../api/listings';
import type { Listing } from '../api/types';
import EmptyState from '../components/EmptyState';
import ListingImage from '../components/ListingImage';
import Notice from '../components/Notice';
import Pagination from '../components/Pagination';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFetch } from '../hooks/useFetch';
import { formatPrice } from '../utils/format';

const ITEMS_PER_PAGE = 12;

interface MyListingCardProps {
  listing: Listing;
  deleting: boolean;
  onDelete: () => void;
}

function MyListingCard({ listing, deleting, onDelete }: MyListingCardProps) {
  const removed = listing.moderation_status === 'removed';

  return (
    <article className="card">
      <div className="card-image">
        <ListingImage src={listing.imagePath} alt={listing.title} />
      </div>
      <div className="card-content">
        <h3 className="card-title">{listing.title}</h3>
        <div className="card-price">{formatPrice(listing.price)}</div>
        <div className="card-meta">
          <span className="badge badge-category">{listing.category}</span>
          {removed ? (
            <span className="badge badge-no-cert">Снято модератором</span>
          ) : (
            <span className="badge badge-stock">Опубликовано</span>
          )}
        </div>
        {removed && listing.removal_reason && <Notice kind="danger">Причина: {listing.removal_reason}</Notice>}
        <div className="my-listing-actions">
          <Link to={`/product/${listing.id}`} className="btn btn-secondary btn-sm">
            Открыть
          </Link>
          <Link to={`/listings/${listing.id}/edit`} className="btn btn-secondary btn-sm">
            Редактировать
          </Link>
          <button type="button" className="btn btn-secondary btn-sm" disabled={deleting} onClick={onDelete}>
            {deleting ? 'Удаляем…' : 'Удалить'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MyListingsPage() {
  useDocumentTitle('Мои объявления');
  const [params, setParams] = useSearchParams();
  const pageParam = Number(params.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { state, reload } = useFetch((signal) => fetchListings({ mine: true, page, limit: ITEMS_PER_PAGE }, signal), [page]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const totalPages = state.status === 'success' ? Math.ceil(state.data.total / ITEMS_PER_PAGE) : 0;

  const goToPage = (nextPage: number, replace = false) => {
    setParams(nextPage > 1 ? { page: String(nextPage) } : {}, { replace });
    window.scrollTo(0, 0);
  };

  // Удалили последнее объявление на странице, и её больше нет: идём на последнюю существующую
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) goToPage(totalPages, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  const handleDelete = async (listing: Listing) => {
    if (!window.confirm(`Удалить объявление «${listing.title}»? Это действие нельзя отменить.`)) return;
    setDeletingId(listing.id);
    setActionError('');
    try {
      await deleteListing(listing.id);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container page-main">
      <div className="page-heading">
        <h1 className="page-title">Мои объявления</h1>
        <Link to="/listings/new" className="btn btn-primary">
          Добавить объявление
        </Link>
      </div>

      {actionError && <Notice kind="danger">{actionError}</Notice>}

      {state.status === 'loading' && <EmptyState title="Загружаем объявления…" />}
      {state.status === 'error' && (
        <EmptyState title="Не удалось загрузить объявления" description={state.message}>
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Повторить
          </button>
        </EmptyState>
      )}
      {state.status === 'success' && state.data.total === 0 && (
        <EmptyState title="У вас пока нет объявлений" description="Разместите первое: это займёт пару минут.">
          <Link to="/listings/new" className="btn btn-primary">
            Добавить объявление
          </Link>
        </EmptyState>
      )}
      {state.status === 'success' && state.data.total > 0 && (
        <>
          <div className="listings-grid">
            {state.data.items.map((listing) => (
              <MyListingCard
                key={listing.id}
                listing={listing}
                deleting={deletingId === listing.id}
                onDelete={() => void handleDelete(listing)}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}
    </div>
  );
}
