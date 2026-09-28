const MAX_DIGITS_BEFORE_DOT = 9;

/**
 * Converte um valor monetário ("2000", "2000.50", "2.000,50" não é aceito) em centavos
 * usando apenas aritmética inteira (sem ponto flutuante).
 * Retorna null se o valor for inválido, zero, negativo ou tiver mais de 2 casas decimais.
 */
export function parseAmountToCents(value) {
  const str = String(value).trim().replace(',', '.');
  const pattern = new RegExp(`^\\d{1,${MAX_DIGITS_BEFORE_DOT}}(\\.\\d{1,2})?$`);
  if (!pattern.test(str)) return null;

  const [integerPart, decimalPart = ''] = str.split('.');
  const cents = Number(integerPart) * 100 + Number(decimalPart.padEnd(2, '0'));
  return cents > 0 ? cents : null;
}
