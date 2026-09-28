const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatMoney = (value) => brl.format(value);

// Datas de lançamento são guardadas em UTC (sem hora): exibir em UTC evita "voltar um dia".
export const formatDate = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const toInputDate = (iso) => new Date(iso).toISOString().slice(0, 10);

export const todayInput = () => new Date().toLocaleDateString('en-CA');
