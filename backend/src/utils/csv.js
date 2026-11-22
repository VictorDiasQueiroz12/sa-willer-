function textCell(value) {
  const text = String(value ?? '');
  // Planilhas podem avaliar texto não confiável como fórmula, mesmo entre aspas.
  const safe = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function reais(cents) {
  return `${cents / 100n},${String(cents % 100n).padStart(2, '0')}`;
}

export function transactionsCsv(items) {
  const lines = ['ID;Data;Descrição;Categoria;Tipo;Valor (BRL);Situação;Responsável'];
  for (const tx of items) {
    lines.push([
      tx.id,
      tx.date.toISOString().slice(0, 10),
      textCell(tx.description),
      textCell(tx.category),
      tx.type === 'INCOME' ? 'Entrada' : 'Saída',
      reais(tx.amountCents),
      tx.deletedAt ? 'Excluído' : 'Ativo',
      textCell(tx.createdBy.name),
    ].join(';'));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
