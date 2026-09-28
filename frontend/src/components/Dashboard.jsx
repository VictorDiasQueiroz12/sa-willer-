import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import AuditLog from './AuditLog.jsx';
import BalanceSummary from './BalanceSummary.jsx';
import TransactionForm from './TransactionForm.jsx';
import TransactionList from './TransactionList.jsx';

const POLL_MS = 10_000;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const isAdmin = user.role === 'ADMIN';

  const [tab, setTab] = useState('transactions');
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [data, setData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const query = new URLSearchParams({ page, limit: 8 });
    if (type) query.set('type', type);
    if (isAdmin && includeDeleted) query.set('includeDeleted', 'true');
    try {
      const [list, bal] = await Promise.all([
        api.get(`/transactions?${query}`),
        api.get('/transactions/balance'),
      ]);
      setData(list);
      setBalance(bal);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [page, type, includeDeleted, isAdmin]);

  // Carrega ao montar/filtrar e atualiza periodicamente (saldo "em tempo real").
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function handleDelete(tx) {
    if (!window.confirm(`Excluir "${tx.description}"? O registro será mantido na auditoria.`)) return;
    try {
      await api.del(`/transactions/${tx.id}`);
      if (editing?.id === tx.id) setEditing(null);
      refresh();
    } catch (err) {
      setError(err);
    }
  }

  async function handleRestore(tx) {
    try {
      await api.post(`/transactions/${tx.id}/restore`);
      refresh();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <header className="topbar">
        <strong className="brand">FinTech Flow</strong>
        <div className="who">
          <span>
            {user.name} <span className={`badge ${isAdmin ? 'admin' : ''}`}>{isAdmin ? 'Admin' : 'Usuário'}</span>
          </span>
          <button className="btn small ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <main className="page">
        <BalanceSummary balance={balance} />

        {error && (
          <div className="alert" role="alert">
            {error.message}
          </div>
        )}

        {isAdmin && (
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'transactions'} onClick={() => setTab('transactions')}>
              Transações
            </button>
            <button role="tab" aria-selected={tab === 'audit'} onClick={() => setTab('audit')}>
              Auditoria
            </button>
          </div>
        )}

        {tab === 'audit' ? (
          <section className="panel">
            <AuditLog />
          </section>
        ) : (
          <div className="grid">
            <TransactionForm
              editing={editing}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                refresh();
              }}
            />

            <section className="panel">
              <div className="filters">
                <h2>Lançamentos</h2>
                <select
                  aria-label="Filtrar por tipo"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todos</option>
                  <option value="INCOME">Entradas</option>
                  <option value="EXPENSE">Saídas</option>
                </select>
                {isAdmin && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={includeDeleted}
                      onChange={(e) => {
                        setIncludeDeleted(e.target.checked);
                        setPage(1);
                      }}
                    />
                    Mostrar excluídos
                  </label>
                )}
              </div>

              <TransactionList
                data={data}
                isAdmin={isAdmin}
                page={page}
                onPage={setPage}
                onEdit={setEditing}
                onDelete={handleDelete}
                onRestore={handleRestore}
              />
            </section>
          </div>
        )}
      </main>
    </>
  );
}
