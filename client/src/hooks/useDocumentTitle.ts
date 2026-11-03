// Заголовок на вкладке браузера. Без аргумента — общий заголовок сайта.
import { useEffect } from 'react';

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — BuildStore` : 'BuildStore — маркетплейс стройматериалов';
  }, [title]);
}
