// Цветная плашка с сообщением. Ошибку экранный диктор зачитает сразу (role="alert").
import type { ReactNode } from 'react';

interface NoticeProps {
  kind?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}

export default function Notice({ kind = 'info', children }: NoticeProps) {
  const className = kind === 'info' ? 'notice' : `notice notice-${kind}`;
  return (
    <div className={className} role={kind === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
