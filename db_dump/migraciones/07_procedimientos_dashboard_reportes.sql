SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS sp_actualizar_estados_tours;
DROP PROCEDURE IF EXISTS sp_obtener_llegadas_dia;
DROP PROCEDURE IF EXISTS sp_obtener_salidas_dia;
DROP PROCEDURE IF EXISTS sp_contar_habitaciones_estado;
DROP PROCEDURE IF EXISTS sp_contar_habitaciones_ocupadas;
DROP PROCEDURE IF EXISTS sp_obtener_huespedes_en_casa;
DROP PROCEDURE IF EXISTS sp_obtener_tours_dia;
DROP PROCEDURE IF EXISTS sp_obtener_cobros_rango;
DROP PROCEDURE IF EXISTS sp_obtener_cobros_por_dia;
DROP PROCEDURE IF EXISTS sp_obtener_saldo_hospedaje;
DROP PROCEDURE IF EXISTS sp_obtener_saldo_tours;
DROP PROCEDURE IF EXISTS sp_obtener_reservas_por_cobrar;
DROP PROCEDURE IF EXISTS sp_reporte_ingresos_resumen;
DROP PROCEDURE IF EXISTS sp_reporte_ingresos_detalle;
DROP PROCEDURE IF EXISTS sp_reporte_ocupacion;
DROP PROCEDURE IF EXISTS sp_reporte_reservas_hospedaje;
DROP PROCEDURE IF EXISTS sp_reporte_reservas_tours;
DROP PROCEDURE IF EXISTS sp_reporte_tours_por_tour;
DROP PROCEDURE IF EXISTS sp_reporte_tours_por_guia;

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
