// Пометки продавца: «Частный продавец» или «Организация «…»» и наличие сертификата.
import type { Listing } from '../api/types';
import { AlertIcon, FileCheckIcon, ShieldIcon } from './Icons';

export default function SellerBadges({ listing }: { listing: Listing }) {
  if (listing.sellerType !== 'organization') {
    return (
      <div className="seller-badges">
        <span className="badge badge-seller-person">Частный продавец</span>
      </div>
    );
  }

  return (
    <div className="seller-badges">
      <span className="badge badge-seller-org" title="Организация прошла проверку документов модератором">
        <ShieldIcon /> Организация{listing.sellerOrgName ? ` «${listing.sellerOrgName}»` : ''}
      </span>
      {listing.certificatePath ? (
        <a className="badge badge-cert" href={listing.certificatePath} target="_blank" rel="noopener noreferrer">
          <FileCheckIcon /> Есть сертификат
        </a>
      ) : (
        <span className="badge badge-no-cert" title="Продавец не приложил сертификат или паспорт товара">
          <AlertIcon /> Нет сертификата
        </span>
      )}
    </div>
  );
}
