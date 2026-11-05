// Поле формы: подпись, само поле, подсказка и ошибка под ним. Если поле типа password,
// появляется кнопка «показать пароль».
import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { EyeIcon } from './Icons';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export default function TextField({ id, label, error, hint, required, type, ...inputProps }: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  const input = (
    <input
      {...inputProps}
      id={id}
      type={isPassword && showPassword ? 'text' : type}
      className={error ? 'form__field is-invalid' : 'form__field'}
      aria-required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
    />
  );

  return (
    <div className="form__group">
      <label className="form__label" htmlFor={id}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-muted field-hint">
          {hint}
        </p>
      )}
      {isPassword ? (
        <div className="password-wrap">
          {input}
          <button
            type="button"
            className={showPassword ? 'icon-btn is-active' : 'icon-btn'}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            <EyeIcon />
          </button>
        </div>
      ) : (
        input
      )}
      {error && (
        <div id={`${id}-error`} className="field-error">
          {error}
        </div>
      )}
    </div>
  );
}
