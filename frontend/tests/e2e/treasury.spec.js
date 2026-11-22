import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { admin, operator } from './accounts.js';

async function login(page, account) {
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tesouraria' })).toBeVisible();
}

test('operador lança, edita e exclui; admin restaura e consulta auditoria', async ({ page }) => {
  const description = 'Pagamento de aluguel E2E';
  const row = page.locator('.tx').filter({ hasText: description });
  const balance = page.locator('.balance-value');

  await page.goto('/');
  await login(page, operator);
  await expect(page.getByRole('button', { name: 'Auditoria' })).toHaveCount(0);
  await page.getByLabel('Descrição').fill(description);
  await page.getByLabel('Valor (R$)').fill('-100');
  await page.getByLabel('Data', { exact: true }).fill('2026-11-22');
  await page.getByRole('button', { name: 'Adicionar lançamento' }).click();
  await expect(page.getByRole('alert')).toContainText('Informe um valor positivo');
  await expect(page.getByLabel('Descrição')).toHaveValue(description);
  await page.getByLabel('Valor (R$)').fill('10000,00');
  await page.getByLabel('Valor (R$)').press('Tab');
  await expect(page.getByLabel('Valor (R$)')).toHaveValue('10.000,00');
  await page.getByLabel('Data', { exact: true }).fill('2026-11-22');
  await page.getByLabel('Categoria (opcional)').fill('Moradia E2E');
  await page.getByRole('button', { name: 'Adicionar lançamento' }).click();
  await expect(row).toBeVisible();
  await expect(balance).toHaveText(/-R\$\s*10\.000,00/);

  await row.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Valor (R$)').fill('2000,01');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(balance).toHaveText(/-R\$\s*2\.000,01/);

  await page.getByRole('searchbox', { name: 'Buscar lançamentos' }).fill('Moradia E2E');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByText('1 lançamento encontrado', { exact: true })).toBeVisible();
  await page.route('**/api/transactions/export?*', (route) => route.fulfill({
    status: 503, json: { error: 'Serviço de exportação indisponível.' },
  }), { times: 1 });
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  const errorDialog = page.getByRole('dialog', { name: 'Não foi possível concluir a operação' });
  await expect(errorDialog).toContainText('Serviço de exportação indisponível.');
  await page.keyboard.press('Escape');
  await expect(errorDialog).toHaveCount(0);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ]);
  expect(await readFile(await download.path(), 'utf8')).toMatch(/Pagamento de aluguel E2E.*2000,01/);

  await page.getByRole('button', { name: 'Resumo mensal' }).click();
  await page.getByLabel('Mês de referência').fill('2026-11');
  await expect(page.getByRole('progressbar', { name: /Moradia E2E/ })).toBeVisible();
  await page.getByRole('button', { name: 'Transações', exact: true }).click();

  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Excluir' }).click();
  await expect(row).toHaveCount(0);
  await expect(balance).toHaveText(/^R\$\s*0,00$/);

  await page.getByRole('button', { name: 'Sair' }).click();
  await login(page, admin);
  await page.getByLabel('Mostrar excluídos').check();
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await row.getByRole('button', { name: 'Restaurar' }).click();
  await expect(balance).toHaveText(/-R\$\s*2\.000,01/);
  await page.getByRole('button', { name: 'Auditoria' }).click();
  await expect(page.getByText(/restaurou a transação/)).toBeVisible();
});

test('formulário não transborda a 320 px e a documentação Swagger abre', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await login(page, admin);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const row = await page.locator('.form-fields .row').boundingBox();
  const field = await page.getByLabel('Data', { exact: true }).boundingBox();
  expect(field.x + field.width).toBeLessThanOrEqual(row.x + row.width + 1);

  await page.goto('/api/docs/');
  await expect(page.getByRole('heading', { name: /FinTech Flow — API de Tesouraria/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /authorize/i })).toBeVisible();
});
