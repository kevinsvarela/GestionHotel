ALTER TABLE pagos
  ADD COLUMN estado ENUM('VIGENTE','ANULADO') NOT NULL DEFAULT 'VIGENTE' AFTER pagado_at,
  ADD COLUMN anulado_por INT UNSIGNED NULL AFTER estado,
  ADD COLUMN anulado_at DATETIME NULL AFTER anulado_por,
  ADD COLUMN motivo_anulacion VARCHAR(200) NULL AFTER anulado_at,
  ADD COLUMN referencia_vigente VARCHAR(50) GENERATED ALWAYS AS (IF(estado = 'VIGENTE', referencia, NULL)) VIRTUAL AFTER motivo_anulacion;

ALTER TABLE pagos
  DROP INDEX uq_pagos_metodo_referencia,
  ADD CONSTRAINT uq_pagos_metodo_referencia UNIQUE (metodo, referencia_vigente),
  ADD CONSTRAINT fk_pagos_anulado_por FOREIGN KEY (anulado_por)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE pagos p
JOIN (
  SELECT MAX(p2.id) AS pago_id, x.exceso
    FROM (
      SELECT p1.reserva_habitacion_id AS reserva_id, SUM(ROUND(p1.monto * p1.tipo_cambio, 2)) - rh.total AS exceso
        FROM pagos p1
        JOIN reservas_habitacion rh ON rh.id = p1.reserva_habitacion_id
       WHERE p1.estado = 'VIGENTE'
       GROUP BY p1.reserva_habitacion_id, rh.total
      HAVING exceso > 0 AND exceso < 1
    ) x
    JOIN pagos p2 ON p2.reserva_habitacion_id = x.reserva_id AND p2.moneda = 'CRC' AND p2.estado = 'VIGENTE'
   GROUP BY x.reserva_id, x.exceso
) c ON c.pago_id = p.id
SET p.monto = p.monto - c.exceso;
