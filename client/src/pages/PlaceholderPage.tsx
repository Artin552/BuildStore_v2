// ВРЕМЕННАЯ заглушка для страниц следующих шагов, чтобы ссылки в шапке и футере уже работали.
// Удалим, когда все страницы будут перенесены.
import EmptyState from '../components/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function PlaceholderPage({ title }: { title: string }) {
  useDocumentTitle(title);

  return (
    <div className="container page-main">
      <h1 className="page-title">{title}</h1>
      <EmptyState
        title="Страница ещё переносится на React"
        description="Она появится на одном из следующих шагов."
      />
    </div>
  );
}
