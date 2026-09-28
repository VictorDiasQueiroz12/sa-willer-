import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAmountToCents } from '../src/utils/money.js';

test('converte valores válidos para centavos sem erro de arredondamento', () => {
  assert.equal(parseAmountToCents('2000'), 200000);
  assert.equal(parseAmountToCents(2000.5), 200050);
  assert.equal(parseAmountToCents('0.1'), 10);
  assert.equal(parseAmountToCents('19,99'), 1999);
  assert.equal(parseAmountToCents('1.15'), 115);
});

test('rejeita valores negativos, zero, com muitas casas ou não numéricos', () => {
  for (const invalid of ['-10', '0', '0.00', '10.999', 'abc', '', '1e3', '9999999999']) {
    assert.equal(parseAmountToCents(invalid), null, `deveria rejeitar "${invalid}"`);
  }
});
