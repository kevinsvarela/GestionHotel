ALTER TABLE pagos
  ADD COLUMN tipo_cambio DECIMAL(10,2) NOT NULL DEFAULT 1.00 AFTER moneda,
  ADD CONSTRAINT chk_pagos_tipo_cambio CHECK (tipo_cambio > 0);
