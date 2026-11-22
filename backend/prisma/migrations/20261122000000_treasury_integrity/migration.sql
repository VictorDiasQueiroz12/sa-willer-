-- A transação excluída não ocupa a chave; reativá-la volta a disputar a mesma chave.
CREATE UNIQUE INDEX "Transaction_active_identity_key"
ON "Transaction" ("createdById", "description", "amountCents", "type", "date")
WHERE "deletedAt" IS NULL;

CREATE TRIGGER "Transaction_validate_insert"
BEFORE INSERT ON "Transaction"
WHEN typeof(NEW."amountCents") <> 'integer'
  OR NEW."amountCents" NOT BETWEEN 1 AND 99999999999
  OR NEW."type" NOT IN ('INCOME', 'EXPENSE')
BEGIN
    SELECT RAISE(ABORT, 'Valor ou tipo de transação inválido');
END;

CREATE TRIGGER "Transaction_validate_update"
BEFORE UPDATE OF "amountCents", "type" ON "Transaction"
WHEN typeof(NEW."amountCents") <> 'integer'
  OR NEW."amountCents" NOT BETWEEN 1 AND 99999999999
  OR NEW."type" NOT IN ('INCOME', 'EXPENSE')
BEGIN
    SELECT RAISE(ABORT, 'Valor ou tipo de transação inválido');
END;

CREATE TRIGGER "Transaction_prevent_delete"
BEFORE DELETE ON "Transaction"
BEGIN
    SELECT RAISE(ABORT, 'Use exclusão lógica para transações');
END;

CREATE TRIGGER "AuditLog_prevent_update"
BEFORE UPDATE ON "AuditLog"
BEGIN
    SELECT RAISE(ABORT, 'A auditoria não pode ser alterada');
END;

CREATE TRIGGER "AuditLog_prevent_delete"
BEFORE DELETE ON "AuditLog"
BEGIN
    SELECT RAISE(ABORT, 'A auditoria não pode ser excluída');
END;
