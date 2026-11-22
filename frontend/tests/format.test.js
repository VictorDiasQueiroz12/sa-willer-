import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMoney, toInputAmount, todayInput } from '../src/format.js';

test('formata valores em centavos sem perder precisão e preserva o sinal abaixo de R$ 1', () => {
  const normalize = (text) => text.replace(/\s/gu, ' ');
  assert.equal(normalize(formatMoney('900719925474099101')), 'R$ 9.007.199.254.740.991,01');
  assert.equal(normalize(formatMoney('-1')), '-R$ 0,01');
  assert.equal(normalize(formatMoney('0')), 'R$ 0,00');
  assert.equal(toInputAmount('200005'), '2000,05');
});

test('preenche uma data local no formato do controle HTML', () => {
  assert.match(todayInput(), /^\d{4}-\d{2}-\d{2}$/);
});
