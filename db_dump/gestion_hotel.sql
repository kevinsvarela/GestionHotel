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
  duracion_horas   DECIMAL(4,1)       NOT NULL,
  precio_persona   DECIMAL(10,2)      NOT NULL,
  cupo_maximo      SMALLINT UNSIGNED  NOT NULL,
  punto_encuentro  VARCHAR(200)       NOT NULL,
  latitud          DECIMAL(9,6)       NULL,
  longitud         DECIMAL(9,6)       NULL,
  foto_url         VARCHAR(255)       NULL,
  activo           BOOLEAN            NOT NULL DEFAULT 1,
  CONSTRAINT chk_tours_duracion CHECK (duracion_horas > 0),
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
  metodo                 ENUM('EFECTIVO','TARJETA','SINPE') NOT NULL,
  referencia             VARCHAR(50)    NULL,
  pagado_at              DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_pagos_metodo_referencia UNIQUE (metodo, referencia),
  CONSTRAINT chk_pagos_monto CHECK (monto > 0),
  CONSTRAINT chk_pagos_moneda CHECK (moneda IN ('CRC','USD')),
  CONSTRAINT chk_pagos_una_reserva CHECK (
    (reserva_habitacion_id IS NOT NULL AND reserva_tour_id IS NULL) OR
    (reserva_habitacion_id IS NULL AND reserva_tour_id IS NOT NULL)
  ),
  CONSTRAINT fk_pagos_reserva_habitacion FOREIGN KEY (reserva_habitacion_id)
    REFERENCES reservas_habitacion (id),
  CONSTRAINT fk_pagos_reserva_tour FOREIGN KEY (reserva_tour_id)
    REFERENCES reservas_tour (id),
  CONSTRAINT fk_pagos_registrado_por FOREIGN KEY (registrado_por)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


USE gestion_hotel;

INSERT INTO roles(nombre) VALUES ('Admin');
INSERT INTO roles(nombre) VALUES ('Recepcionista');
INSERT INTO roles(nombre) VALUES ('Cliente');
