// Карточка товара в списках: на главной и в каталоге.
import { Link } from 'react-router-dom';
import type { Listing } from '../api/types';
import { formatPrice } from '../utils/format';
import ListingImage from './ListingImage';
import SellerBadges from './SellerBadges';

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="card">
      <div className="card-image">
        <ListingImage src={listing.imagePath} alt={listing.title} />
        {listing.discount > 0 && <span className="badge badge-warning card-discount">−{listing.discount}%</span>}
      </div>
      <div className="card-content">
        <h3 className="card-title">{listing.title}</h3>
        {listing.description && <p className="card-description">{listing.description}</p>}
        <div className="card-price">{formatPrice(listing.price)}</div>
        <div className="card-meta">
          <span className="badge badge-category">{listing.category}</span>
          {listing.in_stock === 0 ? (
            <span className="badge badge-out-of-stock">Нет в наличии</span>
          ) : (
            <span className="badge badge-stock">В наличии</span>
          )}
        </div>
        <SellerBadges listing={listing} />
        <div className="card-actions">
          <Link to={`/product/${listing.id}`} className="btn btn-secondary btn-sm">
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}
