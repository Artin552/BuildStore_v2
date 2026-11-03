// Страница 404: её показывает маршрут «*» из App.tsx, если адрес не подошёл ни к одному другому.
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Страница не найдена');

  return (
    <div className="container page-main">
      <EmptyState title="Страница не найдена" description="Возможно, ссылка устарела или в адресе опечатка.">
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
      </EmptyState>
    </div>
  );
}
