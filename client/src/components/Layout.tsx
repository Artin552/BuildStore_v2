// Общий каркас всех страниц. <Outlet /> — место, куда React Router подставляет текущую страницу.
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';

export default function Layout() {
  const { pathname } = useLocation();

  // Новая страница открывается сверху. Сам браузер при переходах внутри React так не делает.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
