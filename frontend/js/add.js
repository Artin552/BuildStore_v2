// ============================================================
// ДОБАВЛЕНИЕ ОБЪЯВЛЕНИЯ (add.js) — для add.html
// ============================================================
// Что изменилось по сравнению со старой версией:
// 1. Сертификат (поле #certificate) теперь реально отправляется на сервер
//    в поле certificateBase64 — раньше он читался формой, но терялся.
// 2. Звёздочка «обязателен» у сертификата появляется для организаций
//    в категориях «Электроинструмент» и «СИЗ».
// 3. Если организация ещё на проверке — сразу показываем это, а не ошибку после отправки.
// 4. Ошибки показываются текстом под формой, а не alert с фигурными скобками.
(function () {
  'use strict';

  const api = window.BuildStoreApi;
  const form = document.getElementById('addForm');
  if (!form) return;

  // Должно совпадать с CERT_REQUIRED_CATEGORIES в backend/routes/listings.js
  const CERT_REQUIRED_CATEGORIES = ['Электроинструмент', 'СИЗ'];
  const MAX_IMAGE = 5 * 1024 * 1024;   // 5 МБ — как на сервере
  const MAX_CERT = 10 * 1024 * 1024;   // 10 МБ — как на сервере

  const errorBox = document.getElementById('addError');
  const submitBtn = document.getElementById('submitBtn');
  let isOrganization = false;

  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Не удалось прочитать файл ' + file.name));
      reader.readAsDataURL(file);
    });
  }

  function updateCertMark() {
    const category = document.getElementById('category').value;
    document.getElementById('certRequiredMark').hidden =
      !(isOrganization && CERT_REQUIRED_CATEGORIES.includes(category));
  }
  document.getElementById('category').addEventListener('change', updateCertMark);

  // Узнаём, кто размещает: частное лицо или организация, и её статус
  async function checkSeller() {
    if (!api.getToken()) {
      window.location.href = '/frontend/auth.html';
      return;
    }
    try {
      const res = await api.apiFetch('/auth/me', { headers: api.authHeaders() });
      const me = await res.json();
      isOrganization = me.type === 'organization';
      const notice = document.getElementById('sellerNotice');
      if (me.status === 'pending' || me.status === 'rejected' || me.status === 'blocked') {
        notice.textContent = me.status === 'pending'
          ? 'Ваша организация проходит проверку. Размещение объявлений станет доступно после подтверждения документов модератором.'
          : me.status === 'rejected'
            ? 'Заявка организации отклонена' + (me.reject_reason ? ': ' + me.reject_reason : '') + '. Размещение объявлений недоступно.'
            : 'Аккаунт заблокирован, размещение объявлений недоступно.';
        notice.hidden = false;
        submitBtn.disabled = true;
      }
      updateCertMark();
    } catch (err) {
      if (err.status === 401) window.location.href = '/frontend/auth.html';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const price = document.getElementById('price').value.trim();
    const description = document.getElementById('description').value.trim();
    const photo = document.getElementById('photo').files[0];
    const certificate = document.getElementById('certificate').files[0];

    // Та же проверка, что на сервере — чтобы не отправлять заведомо неверную форму
    if (title.length < 2) return showError('Укажите заголовок (минимум 2 символа)');
    if (!category) return showError('Выберите категорию');
    if (!/^\d+([.,]\d{1,2})?$/.test(price)) return showError('Укажите цену числом, например 1500');
    if (photo && photo.size > MAX_IMAGE) return showError('Фото больше 5 МБ');
    if (certificate && certificate.size > MAX_CERT) return showError('Сертификат больше 10 МБ');
    if (isOrganization && CERT_REQUIRED_CATEGORIES.includes(category) && !certificate) {
      return showError(`Для организаций в категории «${category}» сертификат или паспорт товара обязателен`);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Публикуем…';
    try {
      const body = { title, category, price: price.replace(',', '.'), description };
      if (photo) body.imageBase64 = await readAsDataURL(photo);
      if (certificate) body.certificateBase64 = await readAsDataURL(certificate); // ← этого раньше не было

      const res = await api.apiFetch('/listings', {
        method: 'POST',
        headers: api.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body)
      }, 20000); // файлы могут быть большими — ждём дольше обычного

      const created = await res.json();
      window.location.href = '/frontend/product.html?id=' + encodeURIComponent(created.id);
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Опубликовать';
    }
  });

  checkSeller();
})();