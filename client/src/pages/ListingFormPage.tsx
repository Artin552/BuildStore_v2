// Форма объявления: один компонент и для добавления (/listings/new),
// и для редактирования (/listings/:id/edit).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { createListing, fetchListing, updateListing } from '../api/listings';
import { CATEGORIES, CERT_REQUIRED_CATEGORIES } from '../api/types';
import type { Listing, ListingInput, Me } from '../api/types';
import EmptyState from '../components/EmptyState';
import ListingImage from '../components/ListingImage';
import Notice from '../components/Notice';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFetch } from '../hooks/useFetch';
import { MB, checkFile, readAsDataUrl } from '../utils/files';

const MAX_IMAGE_BYTES = 5 * MB;
const MAX_CERTIFICATE_BYTES = 10 * MB;
const PRICE_RE = /^\d+([.,]\d{1,2})?$/;
const MAX_PRICE = 1e9; // такой же предел на сервере

// Почему этот пользователь сейчас не может размещать объявления. null — может.
function sellerProblem(user: Me | null): string | null {
  if (!user) return null;
  if (user.status === 'blocked') return 'Аккаунт заблокирован, размещение объявлений недоступно.';
  if (user.type !== 'organization') return null;
  if (user.status === 'pending') {
    return 'Ваша организация проходит проверку. Размещение объявлений станет доступно после подтверждения документов модератором.';
  }
  if (user.status === 'rejected') {
    const reason = user.organization?.reject_reason ?? user.reject_reason;
    return `Заявка организации отклонена${reason ? `: ${reason}` : ''}. Размещение объявлений недоступно.`;
  }
  return null;
}

function ListingForm({ listing }: { listing?: Listing }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = listing !== undefined;

  const [category, setCategory] = useState<string>(listing?.category ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const problem = sellerProblem(user);
  const isOrganization = user?.type === 'organization';
  const certificateRequired = isOrganization && CERT_REQUIRED_CATEGORIES.includes(category);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const price = String(form.get('price') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const photo = form.get('photo');
    const certificate = form.get('certificate');
    const photoFile = photo instanceof File && photo.size > 0 ? photo : null;
    const certificateFile = certificate instanceof File && certificate.size > 0 ? certificate : null;

    if (title.length < 2) return setError('Укажите заголовок (минимум 2 символа)');
    if (!category) return setError('Выберите категорию');
    if (!PRICE_RE.test(price) || Number(price.replace(',', '.')) > MAX_PRICE) {
      return setError('Укажите цену числом, например 1500 или 1500.50');
    }
    // Сертификат нельзя поменять через редактирование, поэтому при правке смотрим на уже приложенный
    const hasCertificate = isEdit ? Boolean(listing.certificatePath) : Boolean(certificateFile);
    if (certificateRequired && !hasCertificate) {
      return setError(
        isEdit
          ? `В категории «${category}» нужен сертификат, а добавить его при редактировании пока нельзя. Создайте новое объявление.`
          : `Для организаций в категории «${category}» сертификат или паспорт товара обязателен`,
      );
    }

    setSubmitting(true);
    setError('');
    try {
      if (photoFile) {
        const photoProblem = await checkFile(photoFile, ['jpg', 'png', 'webp'], MAX_IMAGE_BYTES);
        if (photoProblem) throw new Error(`Фото: ${photoProblem}`);
      }
      if (certificateFile) {
        const certificateProblem = await checkFile(certificateFile, ['pdf', 'jpg', 'png'], MAX_CERTIFICATE_BYTES);
        if (certificateProblem) throw new Error(`Сертификат: ${certificateProblem}`);
      }

      const data: ListingInput = { title, category, price: price.replace(',', '.'), description };
      if (photoFile) data.imageBase64 = await readAsDataUrl(photoFile);
      if (certificateFile) data.certificateBase64 = await readAsDataUrl(certificateFile);

      const saved = isEdit ? await updateListing(listing.id, data) : await createListing(data);
      navigate(`/product/${saved.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <>
      {problem && <Notice kind="warning">{problem}</Notice>}
      {listing?.moderation_status === 'removed' && (
        <Notice kind="danger">
          Объявление снято модератором{listing.removal_reason ? `. Причина: ${listing.removal_reason}` : ''}.
        </Notice>
      )}

      <form className="form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <label className="filter-label" htmlFor="listingTitle">
          Заголовок<span className="required">*</span>
        </label>
        <input
          id="listingTitle"
          name="title"
          className="input"
          maxLength={120}
          placeholder="Например: Перфоратор Makita HR2470"
          defaultValue={listing?.title}
        />

        <label className="filter-label" htmlFor="listingCategory">
          Категория<span className="required">*</span>
        </label>
        <select id="listingCategory" className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Выберите категорию</option>
          {CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <label className="filter-label" htmlFor="listingPrice">
          Цена, ₽<span className="required">*</span>
        </label>
        <input
          id="listingPrice"
          name="price"
          className="input"
          inputMode="decimal"
          placeholder="Например: 8900"
          defaultValue={listing?.price}
        />

        <label className="filter-label" htmlFor="listingDescription">
          Описание
        </label>
        <textarea
          id="listingDescription"
          name="description"
          className="input"
          placeholder="Состояние, характеристики, условия доставки"
          defaultValue={listing?.description ?? ''}
        />

        <label className="filter-label" htmlFor="listingPhoto">
          {isEdit ? 'Новое фото товара' : 'Фото товара'}
        </label>
        <p className="text-muted field-hint">
          JPG, PNG или WEBP, до 5 МБ.
          {isEdit ? ' Если не выбрать файл, останется текущее фото.' : ''}
        </p>
        {isEdit && listing.imagePath && <ListingImage className="listing-form-photo" src={listing.imagePath} alt="Текущее фото" />}
        <input id="listingPhoto" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />

        {isEdit ? (
          <p className="text-muted field-hint">
            {listing.certificatePath ? (
              <>
                Сертификат приложен:{' '}
                <a href={listing.certificatePath} target="_blank" rel="noopener noreferrer">
                  открыть
                </a>
                .{' '}
              </>
            ) : (
              'Сертификат не приложен. '
            )}
            Заменить его при редактировании пока нельзя.
          </p>
        ) : (
          <>
            <label className="filter-label" htmlFor="listingCertificate">
              Паспорт или сертификат товара
              {certificateRequired && <span className="required">* обязателен</span>}
            </label>
            <p className="text-muted field-hint">
              PDF, JPG или PNG, до 10 МБ. Для организаций в категориях «Электроинструмент» и «СИЗ» обязателен. Без него в
              карточке будет пометка «Нет сертификата».
            </p>
            <input
              id="listingCertificate"
              name="certificate"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            />
          </>
        )}

        {error && <Notice kind="danger">{error}</Notice>}

        <div className="form-actions">
          <Link to={isEdit ? '/my-listings' : '/'} className="btn btn-secondary">
            Отмена
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting || problem !== null}>
            {submitting ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </>
  );
}

function EditListing({ id }: { id: string }) {
  const { user } = useAuth();
  const { state, reload } = useFetch((signal) => fetchListing(id, signal), [id]);

  if (state.status === 'loading') return <EmptyState title="Загружаем объявление…" />;
  if (state.status === 'error') {
    if (state.code === 404) {
      return (
        <EmptyState title="Объявление не найдено">
          <Link to="/my-listings" className="btn btn-primary">
            К моим объявлениям
          </Link>
        </EmptyState>
      );
    }
    return (
      <EmptyState title="Не удалось загрузить объявление" description={state.message}>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          Повторить
        </button>
      </EmptyState>
    );
  }
  // Это только подсказка: настоящую проверку делает сервер в PUT /api/listings/:id
  if (user && state.data.owner_id !== user.id) {
    return (
      <EmptyState title="Это не ваше объявление" description="Редактировать объявление может только его владелец.">
        <Link to="/my-listings" className="btn btn-primary">
          К моим объявлениям
        </Link>
      </EmptyState>
    );
  }
  return <ListingForm key={state.data.id} listing={state.data} />;
}

export default function ListingFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const title = isEdit ? 'Редактирование объявления' : 'Новое объявление';
  useDocumentTitle(title);

  return (
    <div className="container page-main listing-form-page">
      <h1 className="page-title">{title}</h1>
      {!isEdit && <ListingForm />}
      {isEdit && /^[1-9]\d{0,8}$/.test(id) && <EditListing id={id} />}
      {isEdit && !/^[1-9]\d{0,8}$/.test(id) && (
        <EmptyState title="Объявление не найдено">
          <Link to="/my-listings" className="btn btn-primary">
            К моим объявлениям
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
