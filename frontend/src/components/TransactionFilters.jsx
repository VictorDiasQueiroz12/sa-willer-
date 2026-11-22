import { useState } from 'react';

export const EMPTY_FILTERS = { q: '', from: '', to: '', type: '', includeDeleted: false };

export default function TransactionFilters({ filters, onApply, isAdmin }) {
  const [draft, setDraft] = useState(filters);
  const set = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const dirty = Object.keys(draft).some((key) => draft[key] !== filters[key]);
  const hasFilters = Object.values(draft).some(Boolean) || Object.values(filters).some(Boolean);

  function apply(event) {
    event.preventDefault();
    const applied = { ...draft, q: draft.q.trim() };
    setDraft(applied);
    onApply(applied);
  }

  return (
    <form className="filter-form" onSubmit={apply}>
      <label>
        Buscar lançamentos
        <input type="search" value={draft.q} maxLength={120} placeholder="Descrição ou categoria"
          onChange={(event) => set('q', event.target.value)} />
      </label>
      <div className="filter-fields">
        <label>
          Tipo
          <select value={draft.type} onChange={(event) => set('type', event.target.value)}>
            <option value="">Todos</option>
            <option value="INCOME">Entradas</option>
            <option value="EXPENSE">Saídas</option>
          </select>
        </label>
        <label>
          De
          <input type="date" value={draft.from} max={draft.to || undefined}
            onChange={(event) => set('from', event.target.value)} />
        </label>
        <label>
          Até
          <input type="date" value={draft.to} min={draft.from || undefined}
            onChange={(event) => set('to', event.target.value)} />
        </label>
      </div>
      <div className="actions filter-actions">
        <button className="btn small">Aplicar filtros</button>
        {hasFilters && (
          <button type="button" className="btn small" onClick={() => {
            setDraft(EMPTY_FILTERS);
            onApply({ ...EMPTY_FILTERS });
          }}>Limpar</button>
        )}
        {isAdmin && (
          <label className="check">
            <input type="checkbox" checked={draft.includeDeleted}
              onChange={(event) => set('includeDeleted', event.target.checked)} />
            Mostrar excluídos
          </label>
        )}
      </div>
      <p className="hint filter-hint">
        {dirty ? 'Aplique as alterações para atualizar a lista e a exportação.' : 'Os filtros afetam a lista e o CSV, não o saldo geral.'}
      </p>
    </form>
  );
}
