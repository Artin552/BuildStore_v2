// Футер сайта: три колонки ссылок и год, который считается сам.
import { Link } from 'react-router-dom';
import { MailIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-column">
            <h4>Покупателям</h4>
            <Link to="/catalog">Каталог товаров</Link>
            <Link to="/cart">Корзина</Link>
            <Link to="/orders">Мои заказы</Link>
          </div>
          <div className="footer-column">
            <h4>Продавцам</h4>
            <Link to="/listings/new">Разместить объявление</Link>
            <Link to="/my-listings">Мои объявления</Link>
          </div>
          <div className="footer-column">
            <h4>Контакты</h4>
            <Link to="/contacts">Автор проекта</Link>
            <Link to="/privacy">Политика конфиденциальности</Link>
            <a href="https://t.me/Artin552" target="_blank" rel="noopener noreferrer">
              <MailIcon /> Написать в Telegram
            </a>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} BuildStore. Все права защищены.</div>
      </div>
    </footer>
  );
}
