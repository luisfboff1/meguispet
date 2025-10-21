-- Migration: Add prazo_pagamento and imposto_percentual to vendas
-- Date: 2025-10-21
-- Run on MariaDB/MySQL. Make a DB backup before applying.

START TRANSACTION;

-- Add prazo_pagamento (flexible text: e.g. "30 dias", "À vista", or an id/label)
ALTER TABLE vendas
    ADD COLUMN IF NOT EXISTS prazo_pagamento VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS imposto_percentual DECIMAL(5,2) NOT NULL DEFAULT 0.00;

-- Normalize existing rows (ensure no NULLs for imposto_percentual)
UPDATE vendas SET imposto_percentual = 0.00 WHERE imposto_percentual IS NULL;

COMMIT;

-- Notes:
-- 1) If you prefer to store prazo_pagamento as an integer (days) instead of VARCHAR,
--    alter the column type to INT and migrate existing string values accordingly.
-- 2) The application/API must be updated to send these fields when creating/updating
--    vendas if you want them persisted. See suggestions in the project README or
--    update api/vendas.php to include `prazo_pagamento` and `imposto_percentual` in
--    INSERT/UPDATE statements and in the GET response.
-- 3) Always test on a staging copy before applying to production.
