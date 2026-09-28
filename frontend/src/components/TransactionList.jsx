import { formatDate, formatDateTime, formatMoney } from '../format.js';

export default function TransactionList({ data, isAdmin, onEdit, onDelete, onRestore, page, onPage }) {
  if (!data) return <p className="empty">Carregando lançamentos…</p>;
  if (data.items.length === 0) {
    return <p className="empty">Nenhum lançamento por aqui. Adicione o primeiro ao lado.</p>;
  }

  return (
    <>
      <ul className="tx-list">
        {data.items.map((tx) => {
          const deleted = Boolean(tx.deletedAt);
          return (
            <li key={tx.id} className={`tx ${deleted ? 'deleted' : ''}`}>
              <div className="tx-main">
                <p className="tx-desc">{tx.description}</p>
                <p className="tx-meta">
                  {formatDate(tx.date)}
                  {tx.category ? ` · ${tx.category}` : ''}
                  {isAdmin && tx.createdByName ? ` · por ${tx.createdByName}` : ''}
                </p>
                {deleted && <p className="tx-meta">Excluído em {formatDateTime(tx.deletedAt)}</p>}
              </div>

              <p className={`tx-amount ${tx.type === 'INCOME' ? 'pos' : 'neg'}`}>
                {tx.type === 'INCOME' ? '+' : '−'} {formatMoney(tx.amount)}
              </p>

              <div className="tx-actions">
                {deleted ? (
                  isAdmin && (
                    <button className="btn small" onClick={() => onRestore(tx)}>
                      Restaurar
                    </button>
                  )
                ) : (
                  <>
                    <button className="btn small" onClick={() => onEdit(tx)}>
                      Editar
                    </button>
                    <button className="btn small danger" onClick={() => onDelete(tx)}>
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <nav className="pager" aria-label="Paginação">
        <button className="btn small" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <span>
          Página {data.page} de {Math.max(data.totalPages, 1)}
        </span>
        <button className="btn small" disabled={page >= data.totalPages} onClick={() => onPage(page + 1)}>
          Próxima
        </button>
      </nav>
    </>
  );
}
