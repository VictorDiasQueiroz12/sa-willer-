import { formatMoney } from '../format.js';

export default function BalanceSummary({ balance }) {
  if (!balance) return <section className="balance" aria-busy="true" />;

  const total = balance.income + balance.expense;
  const incomeShare = total > 0 ? (balance.income / total) * 100 : 50;
  const negative = balance.balance < 0;

  return (
    <section className="balance" aria-live="polite">
      <div>
        <p className="balance-label">Saldo atual</p>
        <p className={`balance-value ${negative ? 'neg' : ''}`}>{formatMoney(balance.balance)}</p>
      </div>

      <div className="balance-flow">
        <div className="flow-bar" role="img" aria-label={`Entradas ${incomeShare.toFixed(0)}% do movimento`}>
          <span className="flow-in" style={{ width: `${incomeShare}%` }} />
        </div>
        <dl className="flow-legend">
          <div>
            <dt>Entradas</dt>
            <dd className="pos">{formatMoney(balance.income)}</dd>
          </div>
          <div>
            <dt>Saídas</dt>
            <dd className="neg">{formatMoney(balance.expense)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
