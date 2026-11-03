// ВРЕМЕННАЯ заглушка для страниц следующих шагов, чтобы ссылки в шапке и футере уже работали.
// Удалим, когда все страницы будут перенесены.
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="container page-main">
      <h1 className="page-title">{title}</h1>
      <div className="empty-state">
        <div className="empty-state-title">Страница ещё переносится на React</div>
        <div className="empty-state-description">Она появится на одном из следующих шагов.</div>
      </div>
    </div>
  );
}
