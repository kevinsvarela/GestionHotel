SET NAMES utf8mb4;

CREATE TABLE roles (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(30) NOT NULL,
  CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE tipos_habitacion (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(60)       NOT NULL,
  descripcion   TEXT              NULL,
  capacidad     TINYINT UNSIGNED  NOT NULL,
  precio_noche  DECIMAL(10,2)     NOT NULL,
  foto_url VARCHAR(255) NULL,
  activo        BOOLEAN           NOT NULL DEFAULT 1,
  CONSTRAINT uq_tipos_habitacion_nombre UNIQUE (nombre),
  CONSTRAINT chk_tipos_habitacion_capacidad CHECK (capacidad > 0),
  CONSTRAINT chk_tipos_habitacion_precio CHECK (precio_noche > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE servicios_habitacion (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(60) NOT NULL,
  CONSTRAINT uq_servicios_habitacion_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE guias (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(120) NOT NULL,
  telefono  VARCHAR(20)  NULL,
  activo    BOOLEAN      NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE idiomas (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(40) NOT NULL,
  CONSTRAINT uq_idiomas_nombre UNIQUE (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE tours (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(120)       NOT NULL,
  descripcion      TEXT               NULL,
  duracion_minutos SMALLINT UNSIGNED  NOT NULL,
  precio_persona   DECIMAL(10,2)      NOT NULL,
  cupo_maximo      SMALLINT UNSIGNED  NOT NULL,
  punto_encuentro  VARCHAR(200)       NOT NULL,
  latitud          DECIMAL(9,6)       NULL,
  longitud         DECIMAL(9,6)       NULL,
  foto_url         VARCHAR(255)       NULL,
  activo           BOOLEAN            NOT NULL DEFAULT 1,
  CONSTRAINT chk_tours_duracion CHECK (duracion_minutos > 0),
  CONSTRAINT chk_tours_precio CHECK (precio_persona > 0),
  CONSTRAINT chk_tours_cupo CHECK (cupo_maximo > 0),
  CONSTRAINT chk_tours_latitud CHECK (latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_tours_longitud CHECK (longitud BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE usuarios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id         INT UNSIGNED  NOT NULL,
  nombre         VARCHAR(80)   NOT NULL,
  apellidos      VARCHAR(120)  NOT NULL,
  identificacion VARCHAR(20)   NULL,
  email          VARCHAR(150)  NOT NULL,
  username       VARCHAR(50)   NULL,
  password       VARCHAR(255)  NOT NULL,
  telefono       VARCHAR(20)   NULL,
  activo         BOOLEAN       NOT NULL DEFAULT 1,
  tkRef          VARCHAR(255)  NULL,
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT uq_usuarios_username UNIQUE (username),
  CONSTRAINT uq_usuarios_identificacion UNIQUE (identificacion),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id)
    REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE habitaciones (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo_habitacion_id  INT UNSIGNED  NOT NULL,
  numero              VARCHAR(10)   NOT NULL,
  piso                TINYINT       NOT NULL,
  estado              ENUM('DISPONIBLE','MANTENIMIENTO','FUERA_SERVICIO')
                      NOT NULL DEFAULT 'DISPONIBLE',
  CONSTRAINT uq_habitaciones_numero UNIQUE (numero),
  CONSTRAINT fk_habitaciones_tipo FOREIGN KEY (tipo_habitacion_id)
    REFERENCES tipos_habitacion (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE servicios_incluidos (
  tipo_habitacion_id      INT UNSIGNED NOT NULL,
  servicio_habitacion_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (tipo_habitacion_id, servicio_habitacion_id),
  CONSTRAINT fk_servicios_incluidos_tipo FOREIGN KEY (tipo_habitacion_id)
    REFERENCES tipos_habitacion (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_servicios_incluidos_servicio FOREIGN KEY (servicio_habitacion_id)
    REFERENCES servicios_habitacion (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE idiomas_guia (
  guia_id    INT UNSIGNED NOT NULL,
  idioma_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (guia_id, idioma_id),
  CONSTRAINT fk_idiomas_guia_guia FOREIGN KEY (guia_id)
    REFERENCES guias (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_idiomas_guia_idioma FOREIGN KEY (idioma_id)
    REFERENCES idiomas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE tours_programados (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tour_id            INT UNSIGNED       NOT NULL,
  guia_id            INT UNSIGNED       NULL,
  fecha_hora_inicio  DATETIME           NOT NULL,
  cupo               SMALLINT UNSIGNED  NOT NULL,
  estado             ENUM('PROGRAMADO','EN_CURSO','FINALIZADO','CANCELADO')
                     NOT NULL DEFAULT 'PROGRAMADO',
  CONSTRAINT chk_tours_programados_cupo CHECK (cupo > 0),
  CONSTRAINT fk_tours_programados_tour FOREIGN KEY (tour_id)
    REFERENCES tours (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tours_programados_guia FOREIGN KEY (guia_id)
    REFERENCES guias (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_tours_programados_tour_fecha (tour_id, fecha_hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE reservas_habitacion (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(20)       NOT NULL,
  cliente_id      INT UNSIGNED      NOT NULL,
  habitacion_id   INT UNSIGNED      NOT NULL,
  registrada_por  INT UNSIGNED      NULL,
  fecha_entrada   DATE              NOT NULL,
  fecha_salida    DATE              NOT NULL,
  huespedes       TINYINT UNSIGNED  NOT NULL,
  precio_noche    DECIMAL(10,2)     NOT NULL,
  total           DECIMAL(10,2)     NOT NULL,
  estado          ENUM('PENDIENTE','CONFIRMADA','EN_CURSO','FINALIZADA','CANCELADA')
                  NOT NULL DEFAULT 'PENDIENTE',
  checkin_at      DATETIME NULL,
  checkout_at     DATETIME NULL,
  CONSTRAINT uq_reservas_habitacion_codigo UNIQUE (codigo),
  CONSTRAINT chk_reservas_habitacion_fechas CHECK (fecha_salida > fecha_entrada),
  CONSTRAINT chk_reservas_habitacion_huespedes CHECK (huespedes > 0),
  CONSTRAINT chk_reservas_habitacion_montos CHECK (precio_noche > 0 AND total > 0),
  CONSTRAINT fk_reservas_habitacion_cliente FOREIGN KEY (cliente_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservas_habitacion_habitacion FOREIGN KEY (habitacion_id)
    REFERENCES habitaciones (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservas_habitacion_registrada_por FOREIGN KEY (registrada_por)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_reservas_habitacion_disponibilidad (habitacion_id, fecha_entrada, fecha_salida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE reservas_tour (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo              VARCHAR(20)       NOT NULL,
  tour_programado_id  INT UNSIGNED      NOT NULL,
  cliente_id          INT UNSIGNED      NOT NULL,
  personas            TINYINT UNSIGNED  NOT NULL,
  precio_persona      DECIMAL(10,2)     NOT NULL,
  total               DECIMAL(10,2)     NOT NULL,
  estado              ENUM('PENDIENTE','CONFIRMADA','FINALIZADA','CANCELADA')
                      NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT uq_reservas_tour_codigo UNIQUE (codigo),
  CONSTRAINT chk_reservas_tour_personas CHECK (personas > 0),
  CONSTRAINT chk_reservas_tour_montos CHECK (precio_persona > 0 AND total > 0),
  CONSTRAINT fk_reservas_tour_tour_programado FOREIGN KEY (tour_programado_id)
    REFERENCES tours_programados (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservas_tour_cliente FOREIGN KEY (cliente_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE pagos (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reserva_habitacion_id  INT UNSIGNED   NULL,
  reserva_tour_id        INT UNSIGNED   NULL,
  registrado_por         INT UNSIGNED   NOT NULL,
  monto                  DECIMAL(10,2)  NOT NULL,
  moneda                 CHAR(3)        NOT NULL DEFAULT 'CRC',
  tipo_cambio            DECIMAL(10,2)  NOT NULL DEFAULT 1.00,
  metodo                 ENUM('EFECTIVO','TARJETA','SINPE') NOT NULL,
  referencia             VARCHAR(50)    NULL,
  pagado_at              DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado                 ENUM('VIGENTE','ANULADO') NOT NULL DEFAULT 'VIGENTE',
  anulado_por            INT UNSIGNED   NULL,
  anulado_at             DATETIME       NULL,
  motivo_anulacion       VARCHAR(200)   NULL,
  referencia_vigente     VARCHAR(50)    GENERATED ALWAYS AS (IF(estado = 'VIGENTE', referencia, NULL)) VIRTUAL,
  CONSTRAINT uq_pagos_metodo_referencia UNIQUE (metodo, referencia_vigente),
  CONSTRAINT chk_pagos_monto CHECK (monto > 0),
  CONSTRAINT chk_pagos_moneda CHECK (moneda IN ('CRC','USD')),
  CONSTRAINT chk_pagos_tipo_cambio CHECK (tipo_cambio > 0),
  CONSTRAINT chk_pagos_una_reserva CHECK (
    (reserva_habitacion_id IS NOT NULL AND reserva_tour_id IS NULL) OR
    (reserva_habitacion_id IS NULL AND reserva_tour_id IS NOT NULL)
  ),
  CONSTRAINT fk_pagos_reserva_habitacion FOREIGN KEY (reserva_habitacion_id)
    REFERENCES reservas_habitacion (id),
  CONSTRAINT fk_pagos_reserva_tour FOREIGN KEY (reserva_tour_id)
    REFERENCES reservas_tour (id),
  CONSTRAINT fk_pagos_registrado_por FOREIGN KEY (registrado_por)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pagos_anulado_por FOREIGN KEY (anulado_por)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DELIMITER //

CREATE PROCEDURE sp_actualizar_estados_tours(
    IN p_ahora DATETIME
)
BEGIN
    UPDATE tours_programados tp
    JOIN tours t ON t.id = tp.tour_id
    SET tp.estado = CASE
        WHEN DATE_ADD(tp.fecha_hora_inicio, INTERVAL t.duracion_minutos MINUTE) <= p_ahora THEN 'FINALIZADO'
        ELSE 'EN_CURSO'
    END
    WHERE tp.estado IN ('PROGRAMADO', 'EN_CURSO')
      AND tp.fecha_hora_inicio <= p_ahora;

    UPDATE reservas_tour rt
    JOIN tours_programados tp ON tp.id = rt.tour_programado_id
    SET rt.estado = 'FINALIZADA'
    WHERE tp.estado = 'FINALIZADO'
      AND rt.estado = 'CONFIRMADA';
END //

CREATE PROCEDURE sp_obtener_llegadas_dia(
    IN p_fecha DATE
)
BEGIN
    SELECT rh.id, rh.codigo, CONCAT(c.nombre, ' ', c.apellidos) AS cliente, h.numero AS habitacion,
           th.nombre AS tipo, rh.huespedes, rh.fecha_salida, rh.estado, rh.total, COALESCE(p.pagado, 0) AS pagado
    FROM reservas_habitacion rh
    INNER JOIN usuarios c ON c.id = rh.cliente_id
    INNER JOIN habitaciones h ON h.id = rh.habitacion_id
    INNER JOIN tipos_habitacion th ON th.id = h.tipo_habitacion_id
    LEFT JOIN (SELECT reserva_habitacion_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                 FROM pagos WHERE estado = 'VIGENTE' AND reserva_habitacion_id IS NOT NULL
                GROUP BY reserva_habitacion_id) p ON p.reserva_habitacion_id = rh.id
    WHERE rh.fecha_entrada = p_fecha AND rh.estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO')
    ORDER BY rh.estado = 'EN_CURSO', h.numero;
END //

CREATE PROCEDURE sp_obtener_salidas_dia(
    IN p_fecha DATE
)
BEGIN
    SELECT rh.id, rh.codigo, CONCAT(c.nombre, ' ', c.apellidos) AS cliente, h.numero AS habitacion,
           th.nombre AS tipo, rh.huespedes, rh.fecha_entrada, rh.estado, rh.total, COALESCE(p.pagado, 0) AS pagado
    FROM reservas_habitacion rh
    INNER JOIN usuarios c ON c.id = rh.cliente_id
    INNER JOIN habitaciones h ON h.id = rh.habitacion_id
    INNER JOIN tipos_habitacion th ON th.id = h.tipo_habitacion_id
    LEFT JOIN (SELECT reserva_habitacion_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                 FROM pagos WHERE estado = 'VIGENTE' AND reserva_habitacion_id IS NOT NULL
                GROUP BY reserva_habitacion_id) p ON p.reserva_habitacion_id = rh.id
    WHERE rh.fecha_salida = p_fecha AND rh.estado IN ('EN_CURSO', 'FINALIZADA')
    ORDER BY rh.estado = 'FINALIZADA', h.numero;
END //

CREATE PROCEDURE sp_contar_habitaciones_estado()
BEGIN
    SELECT estado, COUNT(*) AS cantidad
    FROM habitaciones
    GROUP BY estado;
END //

CREATE PROCEDURE sp_contar_habitaciones_ocupadas(
    IN p_fecha DATE
)
BEGIN
    SELECT COUNT(DISTINCT habitacion_id) AS ocupadas
    FROM reservas_habitacion
    WHERE estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO') AND fecha_entrada <= p_fecha AND fecha_salida > p_fecha;
END //

CREATE PROCEDURE sp_obtener_huespedes_en_casa()
BEGIN
    SELECT COUNT(*) AS reservas, COALESCE(SUM(huespedes), 0) AS huespedes
    FROM reservas_habitacion
    WHERE estado = 'EN_CURSO';
END //

CREATE PROCEDURE sp_obtener_tours_dia(
    IN p_fecha DATE
)
BEGIN
    SELECT tp.id, t.nombre AS tour, tp.fecha_hora_inicio, tp.estado, tp.cupo, g.nombre AS guia,
           t.punto_encuentro,
           COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.personas END), 0) AS reservados
    FROM tours_programados tp
    INNER JOIN tours t ON t.id = tp.tour_id
    LEFT JOIN guias g ON g.id = tp.guia_id
    LEFT JOIN reservas_tour rt ON rt.tour_programado_id = tp.id
    WHERE DATE(tp.fecha_hora_inicio) = p_fecha AND tp.estado <> 'CANCELADO'
    GROUP BY tp.id, t.nombre, tp.fecha_hora_inicio, tp.estado, tp.cupo, g.nombre, t.punto_encuentro
    ORDER BY tp.fecha_hora_inicio;
END //

CREATE PROCEDURE sp_obtener_cobros_rango(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT COUNT(*) AS pagos, COALESCE(SUM(ROUND(monto * tipo_cambio, 2)), 0) AS total
    FROM pagos
    WHERE estado = 'VIGENTE' AND DATE(pagado_at) BETWEEN p_desde AND p_hasta;
END //

CREATE PROCEDURE sp_obtener_cobros_por_dia(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT DATE(pagado_at) AS fecha, COALESCE(SUM(ROUND(monto * tipo_cambio, 2)), 0) AS total
    FROM pagos
    WHERE estado = 'VIGENTE' AND DATE(pagado_at) BETWEEN p_desde AND p_hasta
    GROUP BY DATE(pagado_at);
END //

CREATE PROCEDURE sp_obtener_saldo_hospedaje()
BEGIN
    SELECT COUNT(*) AS reservas, COALESCE(SUM(rh.total - COALESCE(p.pagado, 0)), 0) AS saldo
    FROM reservas_habitacion rh
    LEFT JOIN (SELECT reserva_habitacion_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                 FROM pagos WHERE estado = 'VIGENTE' AND reserva_habitacion_id IS NOT NULL
                GROUP BY reserva_habitacion_id) p ON p.reserva_habitacion_id = rh.id
    WHERE rh.estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO') AND rh.total - COALESCE(p.pagado, 0) > 0;
END //

CREATE PROCEDURE sp_obtener_saldo_tours()
BEGIN
    SELECT COUNT(*) AS reservas, COALESCE(SUM(rt.total - COALESCE(p.pagado, 0)), 0) AS saldo
    FROM reservas_tour rt
    LEFT JOIN (SELECT reserva_tour_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                 FROM pagos WHERE estado = 'VIGENTE' AND reserva_tour_id IS NOT NULL
                GROUP BY reserva_tour_id) p ON p.reserva_tour_id = rt.id
    WHERE rt.estado IN ('PENDIENTE', 'CONFIRMADA') AND rt.total - COALESCE(p.pagado, 0) > 0;
END //

CREATE PROCEDURE sp_obtener_reservas_por_cobrar(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT rh.id, rh.codigo, CONCAT(c.nombre, ' ', c.apellidos) AS cliente, rh.cliente_id, h.numero AS habitacion,
           rh.fecha_entrada, rh.estado, rh.total, COALESCE(p.pagado, 0) AS pagado
    FROM reservas_habitacion rh
    INNER JOIN usuarios c ON c.id = rh.cliente_id
    INNER JOIN habitaciones h ON h.id = rh.habitacion_id
    LEFT JOIN (SELECT reserva_habitacion_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                 FROM pagos WHERE estado = 'VIGENTE' AND reserva_habitacion_id IS NOT NULL
                GROUP BY reserva_habitacion_id) p ON p.reserva_habitacion_id = rh.id
    WHERE rh.estado IN ('PENDIENTE', 'CONFIRMADA') AND rh.fecha_entrada BETWEEN p_desde AND p_hasta
      AND rh.total - COALESCE(p.pagado, 0) > 0
    ORDER BY rh.fecha_entrada, h.numero
    LIMIT 8;
END //

CREATE PROCEDURE sp_reporte_ingresos_resumen(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT p.metodo, p.moneda, COUNT(*) AS cantidad, SUM(p.monto) AS total_moneda,
           SUM(ROUND(p.monto * p.tipo_cambio, 2)) AS total_crc
    FROM pagos p
    WHERE p.estado = 'VIGENTE' AND DATE(p.pagado_at) BETWEEN p_desde AND p_hasta
    GROUP BY p.metodo, p.moneda
    ORDER BY FIELD(p.metodo, 'EFECTIVO', 'TARJETA', 'SINPE'), p.moneda;
END //

CREATE PROCEDURE sp_reporte_ingresos_detalle(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT p.id, p.pagado_at, COALESCE(rh.codigo, rt.codigo) AS codigo_reserva,
           CONCAT(c.nombre, ' ', c.apellidos) AS cliente, p.metodo, p.moneda, p.monto, p.tipo_cambio,
           ROUND(p.monto * p.tipo_cambio, 2) AS monto_crc, p.referencia
    FROM pagos p
    LEFT JOIN reservas_habitacion rh ON rh.id = p.reserva_habitacion_id
    LEFT JOIN reservas_tour rt ON rt.id = p.reserva_tour_id
    LEFT JOIN usuarios c ON c.id = COALESCE(rh.cliente_id, rt.cliente_id)
    WHERE p.estado = 'VIGENTE' AND DATE(p.pagado_at) BETWEEN p_desde AND p_hasta
    ORDER BY p.pagado_at;
END //

CREATE PROCEDURE sp_reporte_ocupacion(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT th.id, th.nombre, COUNT(DISTINCT h.id) AS habitaciones, COUNT(DISTINCT rh.id) AS reservas,
           COALESCE(SUM(GREATEST(DATEDIFF(LEAST(rh.fecha_salida, DATE_ADD(p_hasta, INTERVAL 1 DAY)), GREATEST(rh.fecha_entrada, p_desde)), 0)), 0) AS noches_ocupadas,
           COALESCE(SUM(GREATEST(DATEDIFF(LEAST(rh.fecha_salida, DATE_ADD(p_hasta, INTERVAL 1 DAY)), GREATEST(rh.fecha_entrada, p_desde)), 0) * rh.precio_noche), 0) AS ingreso_estimado
    FROM tipos_habitacion th
    LEFT JOIN habitaciones h ON h.tipo_habitacion_id = th.id
    LEFT JOIN reservas_habitacion rh ON rh.habitacion_id = h.id
          AND rh.estado <> 'CANCELADA'
          AND rh.fecha_entrada <= p_hasta AND rh.fecha_salida > p_desde
    GROUP BY th.id, th.nombre
    ORDER BY th.nombre;
END //

CREATE PROCEDURE sp_reporte_reservas_hospedaje(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT rh.estado, COUNT(*) AS cantidad, SUM(rh.total) AS total, SUM(COALESCE(p.pagado, 0)) AS pagado,
           SUM(CASE WHEN rh.estado = 'CANCELADA' THEN 0 ELSE GREATEST(rh.total - COALESCE(p.pagado, 0), 0) END) AS saldo
    FROM reservas_habitacion rh
    LEFT JOIN (SELECT reserva_habitacion_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                 FROM pagos WHERE reserva_habitacion_id IS NOT NULL AND estado = 'VIGENTE'
                GROUP BY reserva_habitacion_id) p ON p.reserva_habitacion_id = rh.id
    WHERE rh.fecha_entrada BETWEEN p_desde AND p_hasta
    GROUP BY rh.estado
    ORDER BY FIELD(rh.estado, 'PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA');
END //

CREATE PROCEDURE sp_reporte_reservas_tours(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT rt.estado, COUNT(*) AS cantidad, SUM(rt.total) AS total, SUM(COALESCE(p.pagado, 0)) AS pagado,
           SUM(CASE WHEN rt.estado = 'CANCELADA' THEN 0 ELSE GREATEST(rt.total - COALESCE(p.pagado, 0), 0) END) AS saldo
    FROM reservas_tour rt
    INNER JOIN tours_programados tp ON tp.id = rt.tour_programado_id
    LEFT JOIN (SELECT reserva_tour_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                 FROM pagos WHERE reserva_tour_id IS NOT NULL AND estado = 'VIGENTE'
                GROUP BY reserva_tour_id) p ON p.reserva_tour_id = rt.id
    WHERE DATE(tp.fecha_hora_inicio) BETWEEN p_desde AND p_hasta
    GROUP BY rt.estado
    ORDER BY FIELD(rt.estado, 'PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA');
END //

CREATE PROCEDURE sp_reporte_tours_por_tour(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT t.id, t.nombre, COUNT(s.id) AS salidas, COALESCE(SUM(s.cupo), 0) AS cupo,
           COALESCE(SUM(s.personas), 0) AS personas, COALESCE(SUM(s.vendido), 0) AS vendido
    FROM tours t
    LEFT JOIN (SELECT tp.id, tp.tour_id, tp.guia_id, tp.cupo,
                      COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.personas END), 0) AS personas,
                      COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.total END), 0) AS vendido
                 FROM tours_programados tp
                 LEFT JOIN reservas_tour rt ON rt.tour_programado_id = tp.id
                WHERE tp.estado <> 'CANCELADO' AND DATE(tp.fecha_hora_inicio) BETWEEN p_desde AND p_hasta
                GROUP BY tp.id, tp.tour_id, tp.guia_id, tp.cupo) s ON s.tour_id = t.id
    GROUP BY t.id, t.nombre
    ORDER BY personas DESC, t.nombre;
END //

CREATE PROCEDURE sp_reporte_tours_por_guia(
    IN p_desde DATE,
    IN p_hasta DATE
)
BEGIN
    SELECT s.guia_id, COALESCE(g.nombre, 'Sin guía asignado') AS nombre, COUNT(s.id) AS salidas,
           SUM(s.personas) AS personas, SUM(s.vendido) AS vendido
    FROM (SELECT tp.id, tp.tour_id, tp.guia_id, tp.cupo,
                 COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.personas END), 0) AS personas,
                 COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.total END), 0) AS vendido
            FROM tours_programados tp
            LEFT JOIN reservas_tour rt ON rt.tour_programado_id = tp.id
           WHERE tp.estado <> 'CANCELADO' AND DATE(tp.fecha_hora_inicio) BETWEEN p_desde AND p_hasta
           GROUP BY tp.id, tp.tour_id, tp.guia_id, tp.cupo) s
    LEFT JOIN guias g ON g.id = s.guia_id
    GROUP BY s.guia_id, g.nombre
    ORDER BY personas DESC, nombre;
END //

DELIMITER ;

USE gestion_hotel;

INSERT INTO roles(nombre) VALUES ('Admin');
INSERT INTO roles(nombre) VALUES ('Recepcionista');
INSERT INTO roles(nombre) VALUES ('Cliente');
