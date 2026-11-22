import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, formatDateTime, formatMoney } from '../format.js';

const ACTION_LABEL = { CREATE: 'Criou', UPDATE: 'Alterou', DELETE: 'Excluiu', RESTORE: 'Restaurou' };
const fields = [
  ['Descrição', (tx) => tx.description],
  ['Valor', (tx) => formatMoney(tx.amountCents)],
  ['Tipo', (tx) => tx.type === 'INCOME' ? 'Entrada' : 'Saída'],
  ['Categoria', (tx) => tx.category || '—'],
  ['Data', (tx) => formatDate(tx.date)],
  ['Situação', (tx) => tx.deletedAt ? 'Excluído' : 'Ativo'],
];

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    api.get(`/admin/audit?page=${page}&limit=15`, request.signal)
      .then((result) => { if (!request.signal.aborted) setData(result); })
      .catch((err) => { if (!request.signal.aborted) setError(err); });
    return () => request.abort();
  }, [page, retry]);

  function changePage(nextPage) {
    setData(null);
    setPage(nextPage);
  }

  if (error) return (
    <div className="alert" role="alert">
      {error.message}{' '}
      <button className="btn small" onClick={() => {
        setError(null);
        setRetry((value) => value + 1);
      }}>Tentar novamente</button>
    </div>
  );
  if (!data) return <p className="empty">Carregando auditoria…</p>;
  if (data.items.length === 0) return <p className="empty">Ainda não há operações registradas.</p>;

  return (
    <>
      <h2>Histórico de operações</h2>
      <p className="hint filter-hint">Consulte o responsável, o horário e o estado do lançamento antes e depois.</p>
      <ul className="tx-list">
        {data.items.map((log) => {
          const snap = log.after || log.before;
          return (
            <li key={log.id} className="tx audit-entry">
              <div className="tx-main">
                <p className="tx-desc">
                  {log.user.name} {ACTION_LABEL[log.action].toLowerCase()} a transação #{log.transactionId}
                </p>
                <p className="tx-meta">
                  {snap.description} · {formatDateTime(log.createdAt)}
                </p>
              </div>
              <p className="tx-amount">{formatMoney(snap.amountCents)}</p>
              <details>
                <summary>Ver detalhes</summary>
                <dl className="audit-fields">
                  {fields.map(([label, display]) => {
                    const before = log.before && display(log.before);
                    const after = log.after && display(log.after);
                    return <div key={label}>
                      <dt>{label}</dt>
                      <dd>{before && before !== after ? `${before} → ${after || '—'}` : after || before}</dd>
                    </div>;
                  })}
                </dl>
              </details>
            </li>
          );
        })}
      </ul>
      <nav className="pager" aria-label="Paginação">
        <button className="btn small" disabled={page <= 1} onClick={() => changePage(page - 1)}>
          Anterior
        </button>
        <span>
          Página {data.page} de {Math.max(data.totalPages, 1)}
        </span>
        <button className="btn small" disabled={page >= data.totalPages} onClick={() => changePage(page + 1)}>
          Próxima
        </button>
      </nav>
    </>
  );
}
