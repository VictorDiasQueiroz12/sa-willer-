import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMoney, parseInputAmount, toInputAmount, todayInput } from '../src/format.js';

test('formata valores em centavos sem perder precisão e preserva o sinal abaixo de R$ 1', () => {
  const normalize = (text) => text.replace(/\s/gu, ' ');
  assert.equal(normalize(formatMoney('900719925474099101')), 'R$ 9.007.199.254.740.991,01');
  assert.equal(normalize(formatMoney('-1')), '-R$ 0,01');
  assert.equal(normalize(formatMoney('0')), 'R$ 0,00');
  assert.equal(toInputAmount('200005'), '2.000,05');
});

test('aceita reais digitados ou colados e normaliza sem perder centavos', () => {
  for (const input of ['10000,00', '10.000,00', 'R$ 10.000,00', '10000.00', '10.000']) {
    assert.deepEqual(parseInputAmount(input), { cents: 1000000n, decimal: '10000.00' });
  }
  assert.deepEqual(parseInputAmount('0,01'), { cents: 1n, decimal: '0.01' });
  assert.equal(toInputAmount(1000000n), '10.000,00');
  for (const value of ['1.00.00', '12,345', '-2,00', '0,00', '1.000.000.000,00']) {
    assert.equal(parseInputAmount(value), null);
  }
});

test('preenche uma data local no formato do controle HTML', () => {
  assert.match(todayInput(), /^\d{4}-\d{2}-\d{2}$/);
});
