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
  (1, 1, 'Administrador', 'Del Hotel', '7-0123-0456', 'admin@hotel.com', 'adminhotel', '$2y$10$AKQrrfGlTV1ZxKiQ91flVeTmjj10AkDtAmbo.Ox7yETz.MxMpNZoC', '2758-1000', 1),
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
