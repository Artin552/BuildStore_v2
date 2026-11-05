// ЗАГЛУШКА. Эту страницу напишет автор проекта в самом конце, поэтому она пока пустая.
// Сервер уже готов: GET /api/admin/audit?page=&limit= возвращает записи журнала
// и общее число в заголовке X-Total-Count. Тип записи — AuditEntry в api/types.ts.
import EmptyState from '../../components/EmptyState';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function AdminAudit() {
  useDocumentTitle('Журнал действий');

  return <EmptyState title="Журнал действий" description="Эта страница появится на последнем этапе." />;
}
