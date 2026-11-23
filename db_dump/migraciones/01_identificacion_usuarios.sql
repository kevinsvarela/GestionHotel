ALTER TABLE usuarios
  ADD COLUMN identificacion VARCHAR(20) NULL AFTER apellidos,
  ADD CONSTRAINT uq_usuarios_identificacion UNIQUE (identificacion);

UPDATE usuarios SET identificacion = '7-0123-0456' WHERE id = 1 AND identificacion IS NULL;
UPDATE usuarios SET identificacion = '7-0234-0567' WHERE id = 2 AND identificacion IS NULL;
UPDATE usuarios SET identificacion = '1-0987-0654' WHERE id = 3 AND identificacion IS NULL;
UPDATE usuarios SET identificacion = 'P12345678' WHERE id = 4 AND identificacion IS NULL;
