import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDateTime, formatMoney } from '../format.js';

const ACTION_LABEL = { CREATE: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu', RESTORE: 'Restaurou' };

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/audit?page=${page}&limit=15`)
      .then(setData)
      .catch(setError);
  }, [page]);

  if (error) return <div className="alert">{error.message}</div>;
  if (!data) return <p className="empty">Carregando auditoria…</p>;
  if (data.items.length === 0) return <p className="empty">Ainda não há operações registradas.</p>;

  return (
    <>
      <ul className="tx-list">
        {data.items.map((log) => {
          const snap = log.after || log.before;
          const changedAmount =
            log.action === 'UPDATE' && log.before.amountCents !== log.after.amountCents;
          return (
            <li key={log.id} className="tx">
              <div className="tx-main">
                <p className="tx-desc">
                  {log.user.name} {ACTION_LABEL[log.action].toLowerCase()} a transação #{log.transactionId}
                </p>
                <p className="tx-meta">
                  {snap.description} · {formatDateTime(log.createdAt)}
                </p>
              </div>
              <p className="tx-amount">
                {changedAmount
                  ? `${formatMoney(log.before.amount)} → ${formatMoney(log.after.amount)}`
                  : formatMoney(snap.amount)}
              </p>
            </li>
          );
        })}
      </ul>
      <nav className="pager" aria-label="Paginação">
        <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>
          Página {data.page} de {Math.max(data.totalPages, 1)}
        </span>
        <button className="btn small" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
          Próxima
        </button>
      </nav>
    </>
  );
}
