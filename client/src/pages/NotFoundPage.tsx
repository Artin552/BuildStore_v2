// Страница 404: её показывает маршрут «*» из App.tsx, если адрес не подошёл ни к одному другому.
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container page-main">
      <div className="empty-state">
        <h1 className="empty-state-title">Страница не найдена</h1>
        <p className="empty-state-description">Возможно, ссылка устарела или в адресе опечатка.</p>
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
      </div>
    </div>
  );
}
