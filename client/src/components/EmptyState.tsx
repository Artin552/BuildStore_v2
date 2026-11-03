// Блок вместо содержимого: идёт загрузка, ничего не найдено или случилась ошибка.
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  children?: ReactNode; // например, кнопка «Перейти в каталог»
}

export default function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-description">{description}</div>}
      {children && <div className="empty-state-actions">{children}</div>}
    </div>
  );
}
