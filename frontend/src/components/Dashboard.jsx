import { useEffect, useState } from 'react';
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
  const [scope, setScope] = useState(isAdmin ? 'all' : 'mine');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState({ from: '', to: '' });
  const [period, setPeriod] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [formBusy, setFormBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const locked = formBusy || pending;

  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    const query = new URLSearchParams({ page, limit: 8, scope });
    if (type) query.set('type', type);
    if (period.from) query.set('from', period.from);
    if (period.to) query.set('to', period.to);
    if (isAdmin && includeDeleted) query.set('includeDeleted', 'true');

    let request;
    async function load() {
      request?.abort();
      request = new AbortController();
      const { signal } = request;
      try {
        const [list, bal] = await Promise.all([
          api.get(`/transactions?${query}`, signal),
          api.get(`/transactions/balance?scope=${scope}`, signal),
        ]);
        if (signal.aborted) return;
        const lastPage = Math.max(list.totalPages, 1);
        if (page > lastPage) setPage(lastPage);
        else setData(list);
        setBalance(bal);
        setLoadError(null);
      } catch (err) {
        if (!signal.aborted) setLoadError(err);
      }
    }
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      clearInterval(timer);
      request?.abort();
    };
  }, [page, type, scope, period, includeDeleted, isAdmin, revision]);

  async function changeTransaction(operation, message) {
    setPending(true);
    setActionError(null);
    setNotice('');
    try {
      await operation();
      setEditing(null);
      setNotice(message);
      refresh();
    } catch (err) {
      setActionError(err);
    } finally {
      setPending(false);
    }
  }

  function handleDelete(tx) {
    if (!window.confirm(`Excluir "${tx.description}"? O registro será mantido na auditoria.`)) return;
    changeTransaction(() => api.del(`/transactions/${tx.id}`), 'Lançamento excluído e preservado na auditoria.');
  }

  function handleRestore(tx) {
    changeTransaction(() => api.post(`/transactions/${tx.id}/restore`), 'Lançamento restaurado.');
  }

  function resetPage() {
    setPage(1);
    setData(null);
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
        <div className="overview">
          <div>
            <p className="eyebrow">SafeCash · Controle financeiro</p>
            <h1>Tesouraria</h1>
          </div>
          {isAdmin && (
            <label>
              Visão da tesouraria
              <select value={scope} disabled={locked} onChange={(e) => {
                setScope(e.target.value);
                setBalance(null);
                setEditing(null);
                resetPage();
              }}>
                <option value="all">Todos os usuários</option>
                <option value="mine">Meus lançamentos</option>
              </select>
            </label>
          )}
        </div>
        <BalanceSummary balance={balance} />

        {loadError && (
          <div className="alert" role="alert">
            Não foi possível atualizar a tesouraria.{' '}
            <button className="btn small" onClick={refresh}>Tentar novamente</button>
          </div>
        )}
        {actionError && (
          <div className="alert" role="alert">
            {actionError.message}
          </div>
        )}
        {notice && <p className="notice" role="status">{notice}</p>}

        {isAdmin && (
          <nav className="tabs" aria-label="Seções da tesouraria">
            <button aria-pressed={tab === 'transactions'} disabled={locked} onClick={() => setTab('transactions')}>
              Transações
            </button>
            <button aria-pressed={tab === 'audit'} disabled={locked} onClick={() => setTab('audit')}>
              Auditoria
            </button>
          </nav>
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
              busy={formBusy}
              locked={pending}
              onBusyChange={setFormBusy}
              onSaved={(message) => {
                setEditing(null);
                setNotice(message);
                setActionError(null);
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
                      if (e.target.value !== type) resetPage();
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
                        resetPage();
                      }}
                    />
                    Mostrar excluídos
                  </label>
                )}
              </div>
              <form className="period" onSubmit={(e) => {
                e.preventDefault();
                setPeriod({ ...draftPeriod });
                resetPage();
              }}>
                <label>
                  De
                  <input type="date" value={draftPeriod.from} max={draftPeriod.to || undefined}
                    onChange={(e) => setDraftPeriod({ ...draftPeriod, from: e.target.value })} />
                </label>
                <label>
                  Até
                  <input type="date" value={draftPeriod.to} min={draftPeriod.from || undefined}
                    onChange={(e) => setDraftPeriod({ ...draftPeriod, to: e.target.value })} />
                </label>
                <button className="btn small">Filtrar período</button>
                {(draftPeriod.from || draftPeriod.to || period.from || period.to) && (
                  <button className="btn small" type="button" onClick={() => {
                    setDraftPeriod({ from: '', to: '' });
                    setPeriod({ from: '', to: '' });
                    resetPage();
                  }}>Limpar</button>
                )}
              </form>
              <p className="hint filter-hint">Os filtros afetam a lista; o saldo mostra todos os lançamentos ativos da visão selecionada.</p>

              <TransactionList
                data={data}
                isAdmin={isAdmin}
                page={page}
                onPage={(nextPage) => {
                  setData(null);
                  setPage(nextPage);
                }}
                locked={locked}
                onEdit={(tx) => {
                  setEditing(tx);
                  setNotice('');
                  document.getElementById('launch-heading')?.focus();
                }}
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
