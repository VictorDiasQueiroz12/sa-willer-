import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { todayInput } from '../format.js';
import { ActionErrorDialog, SuccessNotice } from './ActionFeedback.jsx';
import AuditLog from './AuditLog.jsx';
import BalanceSummary from './BalanceSummary.jsx';
import MonthlyReport from './MonthlyReport.jsx';
import TransactionFilters, { EMPTY_FILTERS } from './TransactionFilters.jsx';
import TransactionForm from './TransactionForm.jsx';
import TransactionList from './TransactionList.jsx';

const POLL_MS = 10_000;

function filterParams(filters, scope, isAdmin) {
  const query = new URLSearchParams({ scope });
  for (const key of ['type', 'from', 'to', 'q']) {
    if (filters[key]) query.set(key, filters[key]);
  }
  if (isAdmin && filters.includeDeleted) query.set('includeDeleted', 'true');
  return query;
}

const sameBalance = (previous, next) =>
  previous && Object.keys(next).every((field) => previous[field] === next[field]);

function saveCsv(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fintech-flow-lancamentos.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const isAdmin = user.role === 'ADMIN';

  const [tab, setTab] = useState('transactions');
  const [month, setMonth] = useState(() => todayInput().slice(0, 7));
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState(isAdmin ? 'all' : 'mine');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [formBusy, setFormBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRequest = useRef(null);
  const locked = formBusy || pending;

  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    const query = filterParams(filters, scope, isAdmin);
    query.set('page', page);
    query.set('limit', 8);

    let request;
    async function load() {
      request?.abort();
      request = new AbortController();
      const { signal } = request;
      try {
        const [list, bal] = await Promise.all([
          tab === 'transactions' ? api.get(`/transactions?${query}`, signal) : null,
          api.get(`/transactions/balance?scope=${scope}`, signal),
        ]);
        if (signal.aborted) return;
        if (list) {
          const lastPage = Math.max(list.totalPages, 1);
          if (page > lastPage) setPage(lastPage);
          else setData(list);
        }
        setBalance((previous) => sameBalance(previous, bal) ? previous : bal);
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
  }, [page, filters, scope, isAdmin, revision, tab]);

  useEffect(() => () => exportRequest.current?.abort(), []);

  async function downloadCsv() {
    if (exportRequest.current) return;
    const request = new AbortController();
    exportRequest.current = request;
    setExporting(true);
    setActionError(null);
    setNotice('');
    try {
      const query = filterParams(filters, scope, isAdmin);
      const csv = await api.download(`/transactions/export?${query}`, request.signal);
      if (!request.signal.aborted) {
        saveCsv(csv);
        setNotice('CSV gerado com os filtros aplicados.');
      }
    } catch (err) {
      if (!request.signal.aborted) setActionError(err);
    } finally {
      exportRequest.current = null;
      if (!request.signal.aborted) setExporting(false);
    }
  }

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
        <strong className="brand"><img src="/logo.svg" width="28" height="28" alt="" />FinTech Flow</strong>
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
        {actionError && <ActionErrorDialog message={actionError.message} onClose={() => setActionError(null)} />}
        {notice && <SuccessNotice message={notice} onClose={() => setNotice('')} />}

        <nav className="tabs" aria-label="Seções da tesouraria">
          <button aria-pressed={tab === 'transactions'} disabled={locked} onClick={() => setTab('transactions')}>
            Transações
          </button>
          <button aria-pressed={tab === 'monthly'} disabled={locked} onClick={() => setTab('monthly')}>
            Resumo mensal
          </button>
          {isAdmin && (
            <button aria-pressed={tab === 'audit'} disabled={locked} onClick={() => setTab('audit')}>
              Auditoria
            </button>
          )}
        </nav>

        {isAdmin && tab === 'audit' && (
          <section className="panel">
            <AuditLog />
          </section>
        )}
        {tab === 'monthly' && <MonthlyReport key={scope} scope={scope} month={month} onMonthChange={setMonth} />}

        <div hidden={tab !== 'transactions'}>
          <div className="grid">
            <TransactionForm
              key={editing?.id ?? 'new'}
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

            <section className="panel" aria-label="Lançamentos">
              <div className="list-header">
                <h2>Lançamentos</h2>
                <button className="btn small" onClick={downloadCsv} disabled={exporting || !data?.total}>
                  {exporting ? 'Gerando CSV…' : 'Exportar CSV'}
                </button>
              </div>
              <TransactionFilters filters={filters} isAdmin={isAdmin} onApply={(applied) => {
                setFilters(applied);
                resetPage();
              }} />
              {data?.total > 0 && (
                <p className="result-count">{data.total} {data.total === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'}</p>
              )}

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
                }}
                onDelete={handleDelete}
                onRestore={handleRestore}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
