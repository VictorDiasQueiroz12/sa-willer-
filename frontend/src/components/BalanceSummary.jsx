import { memo } from 'react';
import { formatMoney } from '../format.js';

export default memo(function BalanceSummary({ balance }) {
  if (!balance) return <section className="balance" aria-busy="true">Aguardando dados do saldo…</section>;

  const income = BigInt(balance.incomeCents);
  const total = income + BigInt(balance.expenseCents);
  const incomeShare = total > 0n ? Number(income * 10_000n / total) / 100 : 0;
  const negative = BigInt(balance.balanceCents) < 0n;

  return (
    <section className="balance" aria-live="polite">
      <div>
        <p className="balance-label">{balance.scope === 'all' ? 'Saldo consolidado' : 'Meu saldo'}</p>
        <p className={`balance-value ${negative ? 'neg' : ''}`}>{formatMoney(balance.balanceCents)}</p>
      </div>

      <div className="balance-flow">
        <div className={`flow-bar ${total === 0n ? 'no-flow' : ''}`} role="img"
          aria-label={total === 0n ? 'Sem movimentação' : `Entradas ${incomeShare.toFixed(0)}% do movimento`}>
          <span className="flow-in" style={{ width: `${incomeShare}%` }} />
        </div>
        <dl className="flow-legend">
          <div>
            <dt>Entradas</dt>
            <dd className="pos">{formatMoney(balance.incomeCents)}</dd>
          </div>
          <div>
            <dt>Saídas</dt>
            <dd className="neg">{formatMoney(balance.expenseCents)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
});
