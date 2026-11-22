import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatMoney } from '../format.js';

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const validMonth = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;

export default function MonthlyReport({ scope, month, onMonthChange }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!validMonth.test(month)) return;
    const request = new AbortController();
    const query = new URLSearchParams({ scope, month });
    api.get(`/transactions/monthly?${query}`, request.signal)
      .then((result) => { if (!request.signal.aborted) setReport(result); })
      .catch((err) => { if (!request.signal.aborted) setError(err); });
    return () => request.abort();
  }, [scope, month, retry]);

  return (
    <section className="panel monthly" aria-labelledby="monthly-heading">
      <div className="monthly-header">
        <div>
          <p className="eyebrow">Raio-X do caixa</p>
          <h2 id="monthly-heading">Resumo mensal</h2>
          <p className="hint">Veja quanto entrou, quanto saiu e quais categorias pesaram mais no mês.</p>
        </div>
        <label>
          Mês de referência
          <input type="month" value={month} min="0001-01" max="9999-12" onChange={(event) => {
            if (event.target.value === month) return;
            setReport(null);
            setError(null);
            onMonthChange(event.target.value);
          }} />
        </label>
      </div>
      {!validMonth.test(month) ? (
        <p className="empty">Informe um mês no formato AAAA-MM.</p>
      ) : error ? (
        <div className="alert" role="alert">
          {error.message}{' '}
          <button className="btn small" onClick={() => {
            setError(null);
            setRetry((value) => value + 1);
          }}>Tentar novamente</button>
        </div>
      ) : !report ? (
        <p className="empty" role="status">Calculando resumo…</p>
      ) : (
        <MonthlyTotals report={report} />
      )}
    </section>
  );
}

function MonthlyTotals({ report }) {
  const { incomeCents, expenseCents, balanceCents, topExpenses, count, month } = report;
  const expense = BigInt(expenseCents);
  return (
    <>
      <p className="hint">
        {monthLabel.format(new Date(`${month}-01T00:00:00Z`))} · {count} {count === 1 ? 'lançamento ativo' : 'lançamentos ativos'}
      </p>
      <dl className="monthly-totals">
        <div><dt>Entradas no mês</dt><dd className="pos">{formatMoney(incomeCents)}</dd></div>
        <div><dt>Saídas no mês</dt><dd className="neg">{formatMoney(expenseCents)}</dd></div>
        <div><dt>Resultado do mês</dt><dd className={BigInt(balanceCents) < 0n ? 'neg' : 'pos'}>{formatMoney(balanceCents)}</dd></div>
      </dl>
      <h3>Maiores categorias de saída</h3>
      {topExpenses.length === 0 ? (
        <p className="hint">Nenhuma saída registrada neste mês.</p>
      ) : (
        <ul className="category-list">
          {topExpenses.map(({ category, amountCents }) => {
            const percent = Number(BigInt(amountCents) * 10_000n / expense) / 100;
            return (
              <li key={category ?? ''}>
                <div>
                  <strong>{category || 'Sem categoria'}</strong>
                  <span>{formatMoney(amountCents)} · {percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
                </div>
                <progress max={100} value={percent} aria-label={`${category || 'Sem categoria'}: porcentagem das saídas`} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
