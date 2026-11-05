// Регистрация. Частное лицо: имя, e-mail, пароль. Организация: ещё данные компании,
// документы и согласие; такой аккаунт попадает на проверку модератору.
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { AccountType, RegisterRequest } from '../api/types';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MB, checkFile, formatFileSize, readAsDataUrl } from '../utils/files';

const MAX_DOCUMENT_BYTES = 10 * MB;
const MAX_DOCUMENTS = 10;
const MAX_DOCUMENTS_TOTAL_BYTES = 22 * MB; // столько помещается в лимит сервера на регистрацию
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_VALUES = {
  name: '',
  email: '',
  password: '',
  orgName: '',
  inn: '',
  ogrn: '',
  legalAddress: '',
  contactPerson: '',
  contactPosition: '',
  phone: '',
  orgEmail: '',
};

type FieldName = keyof typeof EMPTY_VALUES | 'documents' | 'consent';
type FieldErrors = Partial<Record<FieldName, string>>;

interface PickedDocument {
  file: File;
  error: string | null;
}

export default function RegisterPage() {
  useDocumentTitle('Регистрация');
  const { register } = useAuth();
  const location = useLocation();

  const [accountType, setAccountType] = useState<AccountType>('person');
  const [values, setValues] = useState(EMPTY_VALUES);
  const [documents, setDocuments] = useState<PickedDocument[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOrganization = accountType === 'organization';

  // Общие свойства текстового поля, чтобы не повторять их у каждого
  const field = (name: keyof typeof EMPTY_VALUES) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  const handleDocuments = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const checked = await Promise.all(
      files.map(async (file) => ({ file, error: await checkFile(file, ['pdf', 'jpg', 'png'], MAX_DOCUMENT_BYTES) })),
    );
    setDocuments(checked);
  };

  // Те же правила, что на сервере: ошибку видно сразу у нужного поля
  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    if (values.name.trim().length < 2) found.name = 'Укажите имя (минимум 2 символа)';
    if (!EMAIL_RE.test(values.email.trim())) found.email = 'Некорректный e-mail';
    if (values.password.length < 6) found.password = 'Пароль должен содержать минимум 6 символов';

    if (isOrganization) {
      if (values.orgName.trim().length < 2) found.orgName = 'Укажите название организации или ФИО ИП';
      if (!/^\d{10}(\d{2})?$/.test(values.inn.trim())) found.inn = 'ИНН — 10 или 12 цифр';
      if (values.ogrn.trim() && !/^(\d{13}|\d{15})$/.test(values.ogrn.trim())) found.ogrn = 'ОГРН — 13 цифр, ОГРНИП — 15 цифр';
      if (values.legalAddress.trim().length < 5) found.legalAddress = 'Укажите юридический адрес';
      if (values.contactPerson.trim().length < 2) found.contactPerson = 'Укажите контактное лицо';
      if (!/^[\d+()\- ]{6,20}$/.test(values.phone.trim())) found.phone = 'Укажите корректный телефон компании';
      if (!EMAIL_RE.test(values.orgEmail.trim())) found.orgEmail = 'Укажите корректный e-mail компании';

      if (documents.length === 0) found.documents = 'Загрузите хотя бы один подтверждающий документ';
      else if (documents.length > MAX_DOCUMENTS) found.documents = `Максимум ${MAX_DOCUMENTS} файлов`;
      else if (documents.some((item) => item.error)) found.documents = 'Уберите файлы с ошибками';
      else if (documents.reduce((sum, item) => sum + item.file.size, 0) > MAX_DOCUMENTS_TOTAL_BYTES) {
        found.documents = 'Все файлы вместе должны занимать не больше 22 МБ';
      }

      if (!consent) found.consent = 'Без согласия на обработку данных регистрация организации невозможна';
    }
    return found;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const data: RegisterRequest = {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        type: accountType,
      };
      if (isOrganization) {
        data.consent = true;
        data.organization = {
          orgName: values.orgName.trim(),
          inn: values.inn.trim(),
          ogrn: values.ogrn.trim() || undefined,
          legalAddress: values.legalAddress.trim(),
          contactPerson: values.contactPerson.trim(),
          contactPosition: values.contactPosition.trim() || undefined,
          phone: values.phone.trim(),
          email: values.orgEmail.trim(),
          documents: await Promise.all(documents.map((item) => readAsDataUrl(item.file))),
        };
      }
      await register(data); // дальше GuestRoute сам перенаправит
    } catch (err) {
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-container auth-container--wide">
        <h1 className="auth-title">Регистрация</h1>
        <p className="text-muted">Кто вы? От этого зависят поля и проверка документов.</p>

        <div className="account-type-grid" role="radiogroup" aria-label="Тип аккаунта">
          <label className="account-type-card">
            <input
              type="radio"
              name="accountType"
              checked={!isOrganization}
              onChange={() => {
                setAccountType('person');
                setErrors({});
              }}
            />
            <span className="account-type-title">Частное лицо</span>
            <span className="account-type-desc">Имя, e-mail и пароль. Аккаунт активен сразу.</span>
          </label>
          <label className="account-type-card">
            <input
              type="radio"
              name="accountType"
              checked={isOrganization}
              onChange={() => {
                setAccountType('organization');
                setErrors({});
              }}
            />
            <span className="account-type-title">Организация / ИП</span>
            <span className="account-type-desc">Понадобятся ИНН, адрес и документы. После подачи — проверка модератором.</span>
          </label>
        </div>

        <form className="auth-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <TextField id="regName" label="Имя" placeholder="Как к вам обращаться" autoComplete="name" required {...field('name')} />
          <TextField
            id="regEmail"
            label="E-mail для входа"
            type="email"
            placeholder="you@example.ru"
            autoComplete="email"
            required
            {...field('email')}
          />
          <TextField
            id="regPassword"
            label="Пароль"
            type="password"
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            required
            {...field('password')}
          />

          {isOrganization && (
            <section className="org-fields" aria-label="Данные организации">
              <h2 className="filters-title">Данные компании</h2>
              <TextField
                id="orgName"
                label="Название организации или ФИО ИП"
                placeholder="ООО «СтройБаза»"
                required
                {...field('orgName')}
              />
              <div className="form-row">
                <TextField id="orgInn" label="ИНН" inputMode="numeric" maxLength={12} placeholder="10 или 12 цифр" required {...field('inn')} />
                <TextField id="orgOgrn" label="ОГРН / ОГРНИП" inputMode="numeric" maxLength={15} placeholder="13 или 15 цифр" {...field('ogrn')} />
              </div>
              <TextField
                id="orgAddress"
                label="Юридический адрес"
                placeholder="Индекс, город, улица, дом, офис"
                autoComplete="street-address"
                required
                {...field('legalAddress')}
              />
              <div className="form-row">
                <TextField id="orgContact" label="Контактное лицо" placeholder="ФИО" required {...field('contactPerson')} />
                <TextField id="orgPosition" label="Должность" placeholder="Например, директор" {...field('contactPosition')} />
              </div>
              <div className="form-row">
                <TextField id="orgPhone" label="Телефон компании" type="tel" placeholder="+7 (900) 000-00-00" required {...field('phone')} />
                <TextField id="orgEmail" label="E-mail компании" type="email" placeholder="info@company.ru" required {...field('orgEmail')} />
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="orgDocuments">
                  Подтверждающие документы<span className="required">*</span>
                </label>
                <p className="text-muted field-hint">
                  Выписка ЕГРЮЛ/ЕГРИП или доверенность. PDF, JPG или PNG, до 10 МБ на файл и до 22 МБ всего, можно несколько.
                </p>
                <input
                  id="orgDocuments"
                  className={errors.documents ? 'form__field is-invalid' : 'form__field'}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  multiple
                  aria-invalid={Boolean(errors.documents)}
                  onChange={(event) => void handleDocuments(event)}
                />
                {documents.length > 0 && (
                  <ul className="docs-list">
                    {documents.map((item) => (
                      <li key={`${item.file.name}-${item.file.size}`} className={item.error ? 'docs-list__item--error' : undefined}>
                        {item.file.name} ({formatFileSize(item.file.size)}){item.error ? ` — ${item.error}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {errors.documents && <div className="field-error">{errors.documents}</div>}
              </div>

              <div className="form__group">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={consent}
                    aria-invalid={Boolean(errors.consent)}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    Согласен на обработку персональных и регистрационных данных в соответствии с{' '}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                      политикой конфиденциальности
                    </Link>
                    <span className="required">*</span>
                  </span>
                </label>
                {errors.consent && <div className="field-error">{errors.consent}</div>}
              </div>
            </section>
          )}

          {formError && <Notice kind="danger">{formError}</Notice>}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Отправляем…' : 'Создать аккаунт'}
          </button>
          <p className="text-muted">
            Уже есть аккаунт?{' '}
            <Link to="/login" state={location.state}>
              Войти
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
