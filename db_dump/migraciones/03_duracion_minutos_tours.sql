ALTER TABLE tours ADD COLUMN duracion_minutos SMALLINT UNSIGNED NULL AFTER descripcion;

UPDATE tours SET duracion_minutos = ROUND(duracion_horas * 60);

ALTER TABLE tours
  DROP CHECK chk_tours_duracion,
  DROP COLUMN duracion_horas,
  MODIFY duracion_minutos SMALLINT UNSIGNED NOT NULL,
  ADD CONSTRAINT chk_tours_duracion CHECK (duracion_minutos > 0);
