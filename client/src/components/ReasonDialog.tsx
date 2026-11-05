// Окно с полем «Причина»: нужно, когда модератор отклоняет заявку или снимает объявление.
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { CloseIcon } from './Icons';
import Notice from './Notice';

interface ReasonDialogProps {
  title: string;
  confirmLabel: string;
  onConfirm: (reason: string) => Promise<void>; // успех закрывает окно, ошибка остаётся в нём
  onClose: () => void;
}

export default function ReasonDialog({ title, confirmLabel, onConfirm, onClose }: ReasonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim();
    if (!reason) {
      setError('Укажите причину: её увидит пользователь');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(reason);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="reasonDialogTitle" onClose={onClose}>
      <button type="button" className="modal-close" aria-label="Закрыть" onClick={onClose}>
        <CloseIcon />
      </button>
      <h2 id="reasonDialogTitle" className="filters-title">
        {title}
      </h2>
      <form className="reason-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <label className="filter-label" htmlFor="reasonText">
          Причина<span className="required">*</span>
        </label>
        <textarea id="reasonText" name="reason" className="input" maxLength={500} autoFocus />
        {error && <Notice kind="danger">{error}</Notice>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Сохраняем…' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
