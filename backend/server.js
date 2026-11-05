// backend/server.js
// ============================================================
// ГЛАВНЫЙ ФАЙЛ СЕРВЕРА (Express приложение)
// ============================================================
// Этот файл:
// 1. Инициализирует Express приложение
// 2. Подключает middleware (CORS, Helmet, Rate Limiting и т.д.)
// 3. Подключает маршруты API (/api/auth, /api/listings)
// 4. Раздаёт статические файлы фронтенда (HTML, CSS, JS, изображения)
// 5. Запускает сервер на порту 4000

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // .env из папки backend, откуда бы ни запускали
const authRoutes = require('./routes/auth'); // Маршруты аутентификации
const listingsRoutes = require('./routes/listings'); // Маршруты объявлений
const ordersRoutes = require('./routes/orders'); // Маршруты заказов
const adminRoutes = require('./routes/admin'); // Админ-панель (модерация, пользователи)
const db = require('./db'); // нужен, чтобы дождаться готовности базы и для /api/health

// ============================================================
// ОБРАБОТЧИКИ ОШИБОК
// ============================================================
// Ловим необработанные исключения и выводим их в консоль
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});

// Ловим необработанные отклонённые Promise'ы
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// ============================================================
// ИНИЦИАЛИЗАЦИЯ EXPRESS
// ============================================================
const app = express();
const PORT = process.env.PORT || 4000; // Портт по умолчанию 4000

// За nginx указывайте TRUST_PROXY=1 — тогда express-rate-limit увидит
// реальный IP клиента из X-Forwarded-For, а не IP самого nginx
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

// ============================================================
// MIDDLEWARE (промежуточные обработчики запросов)
// ============================================================
// Включаем CORS (Cross-Origin Resource Sharing) для доступа с разных доменов.
// В продакшене задайте ALLOWED_ORIGIN, например: https://mydomain.ru
const allowedOrigin = process.env.ALLOWED_ORIGIN;
// exposedHeaders — чтобы фронтенд мог прочитать общее число товаров из заголовка X-Total-Count
app.use(cors(allowedOrigin
  ? { origin: allowedOrigin, exposedHeaders: ['X-Total-Count'] }
  : { exposedHeaders: ['X-Total-Count'] }));

// Включаем Helmet для защиты от уязвимостей в HTTP заголовках
app.use(helmet());

// Секрет для подписи токенов. Локально — только предупреждение,
// на боевом сервере (NODE_ENV=production) без него не запускаемся:
// запасной секрет виден всем в открытом репозитории на GitHub
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET не задан или короче 32 символов. Задайте его в backend/.env');
    process.exit(1);
  }
  console.warn('⚠️  JWT_SECRET не задан или короче 32 символов — для продакшена задайте его в .env!');
}

// ============================================================
// RATE LIMITERS (ограничение частоты запросов)
// ============================================================
// Общий rate limiter для всех /api/auth запросов
// Лимит: максимум 20 запросов в минуту
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // окно временм 1 минута
  max: 20, // максимум 20 запросов
  message: { error: 'Too many requests, slow down' }
});
app.use('/api/auth', authLimiter);

// Специальный более строгий rate limiter для /forgot эндпоинта
// Лимит: максимум 3 запроса каждые 15 минут (защита от перебора email'ов)
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 3, // максимум 3 запроса
  message: { error: 'Too many password reset attempts, please try later' }
});
app.use('/api/auth/forgot', forgotLimiter);

// Строгий rate limiter для /reset — защита от подбора 6-значного кода сброса
// Лимит: максимум 5 попыток каждые 15 минут (у кода TTL те же 15 минут)
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many reset attempts, please request a new code later' }
});
app.use('/api/auth/reset', resetLimiter);

// ============================================================
// РАЗБОР ТЕЛА ЗАПРОСА И ЛИМИТЫ РАЗМЕРА
// ============================================================
// Стоит ПОСЛЕ ограничителей частоты: иначе сервер читал бы большой запрос в память
// ещё до проверки, не превышен ли лимит запросов.
// Файлы приходят в base64 внутри JSON, а base64 на треть больше самого файла.

// Объявление: фото до 5 МБ и сертификат до 10 МБ — около 20 МБ в base64.
// Большой запрос читаем только у вошедшего: токен проверяем до разбора тела.
app.use('/api/listings', (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'PUT') return next();
  if (!authRoutes.getUserFromAuthHeader(req)) return res.status(401).json({ error: 'Требуется вход' });
  next();
}, express.json({ limit: '21mb' }));

// Аватар до 2 МБ
app.use('/api/auth/avatar', express.json({ limit: '3mb' }));

// Регистрация организации: документы в сумме до 22 МБ. Адрес открыт всем,
// поэтому лимит не больше необходимого, а частоту ограничивает authLimiter выше.
app.use('/api/auth/register', express.json({ limit: '30mb' }));

// Для всего остального — 2 МБ (защита от DoS атак). Уже разобранное тело этот обработчик пропускает.
app.use(express.json({ limit: process.env.JSON_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || '2mb' }));

// ============================================================
// ЛОГИРОВАНИЕ ЗАПРОСОВ
// ============================================================
// Логируем все запросы к API (полезно для отладки)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ============================================================
// ПОДКЛЮЧЕНИЕ API МАРШРУТОВ
// ============================================================
// Проверка «жив ли сервер и база»: откройте http://127.0.0.1:4000/api/health
app.get('/api/health', async (req, res) => {
  try {
    await db.pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'error', error: err.message });
  }
});

// Все маршруты аутентификации начинаются с /api/auth
app.use('/api/auth', authRoutes.router);

// Все маршруты объявлений начинаются с /api/listings
app.use('/api/listings', listingsRoutes);

// Все маршруты заказов начинаются с /api/orders
app.use('/api/orders', ordersRoutes);

// Все маршруты админ-панели начинаются с /api/admin (доступ проверяется на бэкенде по ролям)
app.use('/api/admin', adminRoutes);

// ============================================================
// ОБЩИЙ ОБРАБОТЧИК ОШИБОК
// ============================================================
// ВАЖНО: регистрируется ПОСЛЕ маршрутов, иначе Express не передаёт
// в него ошибки, возникшие в обработчиках маршрутов
// (например, ошибки парсинга JSON тела или throw в роутах)
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err); // Если уже был отправлен ответ, пропускаем
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// ЗАЩИТА ОТ УТЕЧКИ БАЗЫ ДАННЫХ
// ============================================================
// Блокируем любые запросы к .db-файлам ДО раздачи статики,
// чтобы users.db и подобные файлы никогда не отдавались наружу
// Смотрим только путь: поиск /catalog?q=a.db — обычная страница, а не файл базы
app.use((req, res, next) => {
  if (req.path.includes('.db')) {
    return res.status(403).send('Forbidden');
  }
  next();
});

// Старая главная: на /index.html ведёт логотип на страницах из /frontend.
// Маршрут стоит раньше статики React: в client/dist тоже есть файл index.html
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ============================================================
// РАЗДАЧА REACT-КЛИЕНТА (client/dist)
// ============================================================
// Стоит раньше старого фронтенда: в обеих папках есть /img/placeholder.svg
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const CLIENT_INDEX = path.join(CLIENT_DIST, 'index.html');
if (!fs.existsSync(CLIENT_INDEX)) {
  console.warn('⚠️  React-клиент не собран. Выполните npm run build в папке client');
}

// В именах файлов из /assets есть хеш содержимого, поэтому браузер может хранить их долго
app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(CLIENT_DIST, { index: false }));

// ============================================================
// РАЗДАЧА СТАТИЧЕСКИХ ФАЙЛОВ (старый фронтенд)
// ============================================================
// Раздаём CSS файлы при запросе http://localhost:4000/css/...
app.use('/css', express.static(path.join(__dirname, '..', 'frontend', 'css')));

// Раздаём JavaScript файлы при запросе http://localhost:4000/js/...
app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'js')));

// Раздаём изображения при запросе http://localhost:4000/img/...
app.use('/img', express.static(path.join(__dirname, '..', 'frontend', 'img')));

// Раздаём загруженные изображения объявлений при запросе http://localhost:4000/uploads/...
// С автоматической установкой правильного Content-Type
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res, filepath) => {
    const ext = path.extname(filepath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      res.setHeader('Content-Type', `image/${ext.slice(1)}`);
    }
  }
}));
// ============================================================
// СПЕЦИАЛЬНЫЕ МАРШРУТЫ ДЛЯ HTML СТРАНИЦ
// ============================================================


// Адрес /my-listings теперь обслуживает React, старая страница осталась по адресу с .html
  app.get('/my-listings.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'my-listings.html'));
  });
// Защита от утечки базы данных: основной блок находится выше, до статики
console.log('Frontend path:', path.join(__dirname, '..', 'frontend'));
console.log('Root path:', path.join(__dirname, '..'));
// Раздаём все остальные файлы из папки frontend (HTML файлы и т.д.)
// ВАЖНО: это НЕ раздаёт репозиторий корень (.env, server.js, *.db)
// Статика подключена и с корня, и с префикса /frontend, чтобы работали
// и ссылки вида /auth.html, и редиректы вида /frontend/auth.html
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend'), { index: false }));
app.use(express.static(path.join(__dirname, '..', 'frontend'), { index: false }));



// ============================================================
// SPA FALLBACK
// ============================================================
// Неизвестный адрес API — ошибка в JSON, а не HTML-страница
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Адрес API не найден' });
});

// SPA fallback. На сервере есть одна страница React, а адреса вроде /catalog или /product/5
// она разбирает сама в браузере. Поэтому на такие адреса отдаём её же.
// В Express 5 запись app.get('*') не работает, поэтому это обычный обработчик.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/uploads/') || req.path.startsWith('/frontend/')) return next();
  // Адрес с расширением — это файл. Если его нет, нужен честный 404: HTML вместо .js
  // браузер не сможет запустить, и причину будет трудно найти
  if (path.extname(req.path)) return next();

  if (!fs.existsSync(CLIENT_INDEX)) {
    return res.status(503).type('text/plain; charset=utf-8').send('React-клиент не собран. Выполните npm run build в папке client');
  }
  res.sendFile(CLIENT_INDEX, (err) => {
    if (err) next(err);
  });
});

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================
const HOST = process.env.HOST || '127.0.0.1'; // По умолчанию локальный хост
let server;
// Сначала ждём, пока база подключится и создаст таблицы, и только потом
// открываем порт. Раньше «✅ Сервер запущен» печаталось даже при ошибке пароля.
db.dbReady
  .then(() => {
    server = app.listen(PORT, HOST, () => {
      console.log(`✅ Сервер запущен: http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Не удалось подключиться к PostgreSQL:', err.message);
    console.error('   Проверьте PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD в backend/.env');
    process.exit(1);
  });

// ============================================================
// ОБРАБОТКА ЗАВЕРШЕНИЯ СЕРВЕРА
// ============================================================
// (server ещё может не существовать, если база не успела подключиться)
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));

// При получении сигнала SIGTERM корректно завершаем сервер
process.on('SIGTERM', () => shutdown('SIGTERM'));
