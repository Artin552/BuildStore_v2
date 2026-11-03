// Картинка товара: нет пути или файл не загрузился — показываем заглушку.
import type { SyntheticEvent } from 'react';

export const PLACEHOLDER_IMAGE = '/img/placeholder.svg';

function showPlaceholder(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  // Проверка нужна, чтобы при ошибке самой заглушки не получить бесконечный цикл
  if (!image.src.endsWith(PLACEHOLDER_IMAGE)) image.src = PLACEHOLDER_IMAGE;
}

interface ListingImageProps {
  src: string;
  alt: string;
  className?: string;
  lazy?: boolean;
}

export default function ListingImage({ src, alt, className, lazy = true }: ListingImageProps) {
  return (
    <img
      src={src || PLACEHOLDER_IMAGE}
      alt={alt}
      className={className}
      loading={lazy ? 'lazy' : undefined}
      onError={showPlaceholder}
    />
  );
}
