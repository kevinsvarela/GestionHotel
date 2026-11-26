-- ============================================================
--  Datos iniciales (seeders) de Gestión Hotel
--  Se ejecuta después de gestion_hotel.sql (orden alfabético
--  de docker-entrypoint-initdb.d). Usa INSERT IGNORE para poder
--  volver a correrlo sin duplicar datos.
--
--  Usuarios de prueba (contraseñas guardadas con password_hash):
--    adminhotel   / Admin#2026      -> Admin
--    recepcion01  / Recepcion#2026  -> Recepcionista
--    clientes     / Cliente#2026    -> Cliente (solo como registro)
-- ============================================================

SET NAMES utf8mb4;

INSERT IGNORE INTO usuarios (id, rol_id, nombre, apellidos, identificacion, email, username, password, telefono, activo) VALUES
  (1, 1, 'Kevin', 'Simpson Varela', '7-0123-0456', 'admin@hotel.com', 'adminhotel', '$2y$10$AKQrrfGlTV1ZxKiQ91flVeTmjj10AkDtAmbo.Ox7yETz.MxMpNZoC', '2758-1000', 1),
  (2, 2, 'Recepción', 'Del Hotel', '7-0234-0567', 'recepcion@hotel.com', 'recepcion01', '$2y$10$qiBB4ezOnnjsEUZHoIDjUuBq6Feoc9ZyUXr4ERaqvsrKzii/2iH0C', '2758-1001', 1),
  (3, 3, 'María', 'Rodríguez Mora', '1-0987-0654', 'maria.rodriguez@correo.com', 'mariarod01', '$2y$10$4UNBKudma3xhvNM7nZkG.OivFXrNxiG.Msqwb.0CyISEXUavT2zVG', '8811-2233', 1),
  (4, 3, 'José', 'Campos Vargas', 'P12345678', 'jose.campos@correo.com', 'josecampos', '$2y$10$4UNBKudma3xhvNM7nZkG.OivFXrNxiG.Msqwb.0CyISEXUavT2zVG', '8722-3344', 1);

INSERT IGNORE INTO tipos_habitacion (id, nombre, descripcion, capacidad, precio_noche, activo) VALUES
  (1, 'Sencilla', 'Una cama individual, baño privado y aire acondicionado.', 1, 25000.00, 1),
  (2, 'Doble', 'Dos camas o una cama matrimonial, ideal para parejas.', 2, 40000.00, 1),
  (3, 'Familiar', 'Una cama matrimonial y dos individuales, con vista al jardín.', 4, 65000.00, 1),
  (4, 'Suite', 'Cama king, sala, balcón y vista al mar.', 2, 95000.00, 1);

INSERT IGNORE INTO habitaciones (id, tipo_habitacion_id, numero, piso, estado) VALUES
  (1, 1, '101', 1, 'DISPONIBLE'),
  (2, 1, '102', 1, 'DISPONIBLE'),
  (3, 2, '103', 1, 'MANTENIMIENTO'),
  (4, 2, '201', 2, 'DISPONIBLE'),
  (5, 2, '202', 2, 'DISPONIBLE'),
  (6, 3, '203', 2, 'DISPONIBLE'),
  (7, 3, '301', 3, 'FUERA_SERVICIO'),
  (8, 4, '302', 3, 'DISPONIBLE');

INSERT IGNORE INTO servicios_habitacion (id, nombre) VALUES
  (1, 'Wi-Fi'),
  (2, 'Aire acondicionado'),
  (3, 'Televisión por cable'),
  (4, 'Agua caliente'),
  (5, 'Desayuno incluido'),
  (6, 'Minibar'),
  (7, 'Caja fuerte'),
  (8, 'Balcón'),
  (9, 'Vista al mar'),
  (10, 'Jacuzzi');

INSERT IGNORE INTO tours (id, nombre, descripcion, duracion_minutos, precio_persona, cupo_maximo, punto_encuentro, latitud, longitud, activo) VALUES
  (1, 'Parque Nacional Cahuita', 'Caminata guiada por el sendero costero del parque, con observación de monos, perezosos y aves. Incluye tiempo para nadar en la playa.', 240, 18000.00, 15, 'Entrada Kelly Creek, Cahuita', 9.737600, -82.840600, 1),
  (2, 'Canales de Tortuguero', 'Recorrido en lancha por los canales del Parque Nacional Tortuguero para observar caimanes, tortugas y aves acuáticas.', 480, 45000.00, 12, 'Recepción del hotel', NULL, NULL, 1),
  (3, 'Tour de chocolate en Talamanca', 'Visita a una finca de cacao de la comunidad bribri, con demostración del proceso artesanal y degustación.', 180, 22000.00, 20, 'Recepción del hotel', NULL, NULL, 1),
  (4, 'Snorkel en Punta Uva', 'Salida en grupo pequeño para hacer snorkel en el arrecife de Punta Uva. Incluye equipo y guía.', 150, 25000.00, 10, 'Playa Punta Uva', 9.639000, -82.693000, 1),
  (5, 'Avistamiento de aves al amanecer', 'Caminata temprano por bosque secundario con guía especializado en aves. Incluye binoculares.', 210, 15000.00, 8, 'Recepción del hotel', NULL, NULL, 0);

INSERT IGNORE INTO guias (id, nombre, telefono, activo) VALUES
  (1, 'Andrés Brenes Salazar', '8833-4455', 1),
  (2, 'Carolina Hernández Ruiz', '8744-5566', 1),
  (3, 'Esteban Martínez Lobo', '8655-6677', 0);

INSERT IGNORE INTO idiomas (id, nombre) VALUES
  (1, 'Español'),
  (2, 'Inglés'),
  (3, 'Francés'),
  (4, 'Alemán'),
  (5, 'Italiano'),
  (6, 'Portugués');

INSERT IGNORE INTO idiomas_guia (guia_id, idioma_id) VALUES
  (1, 1),
  (1, 2),
  (2, 1),
  (2, 2),
  (2, 3),
  (3, 1),
  (3, 4);

INSERT IGNORE INTO tours_programados (id, tour_id, guia_id, fecha_hora_inicio, cupo, estado) VALUES
  (1, 1, 1, '2026-12-05 08:00:00', 15, 'PROGRAMADO'),
  (2, 2, 2, '2026-12-06 06:30:00', 12, 'PROGRAMADO'),
  (3, 3, NULL, '2026-12-06 14:00:00', 20, 'PROGRAMADO'),
  (4, 4, 1, '2026-12-08 09:00:00', 10, 'PROGRAMADO'),
  (5, 1, 2, '2026-12-12 08:00:00', 15, 'PROGRAMADO'),
  (6, 2, NULL, '2026-11-20 06:30:00', 12, 'FINALIZADO'),
  (7, 3, 1, '2026-11-22 14:00:00', 20, 'CANCELADO');

INSERT IGNORE INTO reservas_habitacion (id, codigo, cliente_id, habitacion_id, registrada_por, fecha_entrada, fecha_salida, huespedes, precio_noche, total, estado, checkin_at, checkout_at) VALUES
  (1, 'RH-0001', 3, 4, 2, '2026-11-15', '2026-11-18', 2, 40000.00, 120000.00, 'FINALIZADA', '2026-11-15 14:10:00', '2026-11-18 11:00:00'),
  (2, 'RH-0002', 4, 8, 2, '2026-11-22', '2026-11-26', 2, 95000.00, 380000.00, 'EN_CURSO', '2026-11-22 15:30:00', NULL),
  (3, 'RH-0003', 3, 6, 2, '2026-12-05', '2026-12-08', 4, 65000.00, 195000.00, 'CONFIRMADA', NULL, NULL),
  (4, 'RH-0004', 4, 1, 1, '2026-12-10', '2026-12-12', 1, 25000.00, 50000.00, 'PENDIENTE', NULL, NULL),
  (5, 'RH-0005', 3, 5, 2, '2026-11-28', '2026-11-30', 2, 40000.00, 80000.00, 'CANCELADA', NULL, NULL);

INSERT IGNORE INTO reservas_tour (id, codigo, tour_programado_id, cliente_id, personas, precio_persona, total, estado) VALUES
  (1, 'RT-0001', 1, 3, 2, 18000.00, 36000.00, 'CONFIRMADA'),
  (2, 'RT-0002', 1, 4, 3, 18000.00, 54000.00, 'PENDIENTE'),
  (3, 'RT-0003', 2, 4, 2, 45000.00, 90000.00, 'CONFIRMADA'),
  (4, 'RT-0004', 6, 3, 2, 45000.00, 90000.00, 'FINALIZADA'),
  (5, 'RT-0005', 4, 3, 1, 25000.00, 25000.00, 'CANCELADA');

INSERT IGNORE INTO pagos (id, reserva_habitacion_id, reserva_tour_id, registrado_por, monto, moneda, metodo, referencia, pagado_at) VALUES
  (1, 1, NULL, 2, 120000.00, 'CRC', 'TARJETA', 'TJ-458812', '2026-11-18 11:05:00'),
  (2, 2, NULL, 2, 200000.00, 'CRC', 'SINPE', 'SP-77120345', '2026-11-22 15:40:00'),
  (3, 3, NULL, 2, 50000.00, 'CRC', 'SINPE', 'SP-77120998', '2026-11-20 10:15:00'),
  (4, NULL, 1, 2, 36000.00, 'CRC', 'EFECTIVO', NULL, '2026-11-21 09:30:00'),
  (5, NULL, 4, 2, 90000.00, 'CRC', 'TARJETA', 'TJ-459031', '2026-11-19 16:20:00');
