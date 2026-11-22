const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function splitCents(value) {
  const cents = BigInt(value);
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  return { negative, whole: absolute / 100n, fraction: String(absolute % 100n).padStart(2, '0') };
}

export function formatMoney(value) {
  const { negative, whole, fraction } = splitCents(value);
  const signed = negative ? (whole === 0n ? -0 : -whole) : whole;
  return brl.formatToParts(signed).map((part) => part.type === 'fraction' ? fraction : part.value).join('');
}

export function toInputAmount(value) {
  const { negative, whole, fraction } = splitCents(value);
  return `${negative ? '-' : ''}${whole.toLocaleString('pt-BR')},${fraction}`;
}

// A interface aceita o agrupamento brasileiro; a API continua recebendo decimal sem agrupamento.
export function parseInputAmount(value) {
  const text = value.trim().replace(/^R\$\s*/u, '');
  const grouped = /^\d{1,3}(\.\d{3}){1,2}(,\d{1,2})?$/.test(text);
  const normalized = (grouped ? text.replaceAll('.', '') : text).replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return cents > 0n ? { cents, decimal: `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}` } : null;
}

// Datas de lançamento são guardadas em UTC (sem hora): exibir em UTC evita "voltar um dia".
export const formatDate = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const toInputDate = (iso) => new Date(iso).toISOString().slice(0, 10);

export function todayInput() {
  const now = new Date();
  const twoDigits = (number) => String(number).padStart(2, '0');
  return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
}
