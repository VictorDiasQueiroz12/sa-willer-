import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { toInputDate, todayInput } from '../format.js';

const emptyForm = () => ({
  description: '',
  amount: '',
  type: 'EXPENSE',
  category: '',
  date: todayInput(),
});

export default function TransactionForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(null);
    setForm(
      editing
        ? {
            description: editing.description,
            amount: editing.amount.toFixed(2),
            type: editing.type,
            category: editing.category || '',
            date: toInputDate(editing.date),
          }
        : emptyForm(),
    );
  }, [editing]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const amount = form.amount.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError({ message: 'Informe um valor positivo com até 2 casas decimais.' });
      return;
    }

    const payload = {
      description: form.description,
      amount,
      type: form.type,
      category: form.category.trim() || null,
      date: form.date,
    };

    setBusy(true);
    try {
      if (editing) await api.put(`/transactions/${editing.id}`, payload);
      else await api.post('/transactions', payload);
      setForm(emptyForm());
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>{editing ? `Editar lançamento #${editing.id}` : 'Novo lançamento'}</h2>

      <fieldset className="segmented">
        <legend className="sr-only">Tipo</legend>
        <label className={form.type === 'EXPENSE' ? 'on expense' : ''}>
          <input type="radio" name="type" value="EXPENSE" checked={form.type === 'EXPENSE'} onChange={set('type')} />
          Saída
        </label>
        <label className={form.type === 'INCOME' ? 'on income' : ''}>
          <input type="radio" name="type" value="INCOME" checked={form.type === 'INCOME'} onChange={set('type')} />
          Entrada
        </label>
      </fieldset>

      <label>
        Descrição
        <input
          value={form.description}
          onChange={set('description')}
          placeholder="Pagamento de aluguel"
          required
          minLength={3}
          maxLength={120}
        />
      </label>

      <div className="row">
        <label>
          Valor (R$)
          <input
            value={form.amount}
            onChange={set('amount')}
            inputMode="decimal"
            placeholder="2000,00"
            required
          />
        </label>
        <label>
          Data
          <input type="date" value={form.date} onChange={set('date')} required />
        </label>
      </div>

      <label>
        Categoria <span className="optional">(opcional)</span>
        <input value={form.category} onChange={set('category')} maxLength={60} placeholder="Moradia" />
      </label>

      {error && (
        <div className="alert" role="alert">
          {error.message}
          {error.details?.map((d) => (
            <div key={d.field + d.message}>{d.message}</div>
          ))}
        </div>
      )}

      <div className="actions">
        <button className="btn primary" disabled={busy}>
          {busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar lançamento'}
        </button>
        {editing && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
