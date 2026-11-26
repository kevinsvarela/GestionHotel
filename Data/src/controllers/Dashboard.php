<?php

namespace App\controllers;

use Illuminate\Database\Capsule\Manager as Capsule;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;

class Dashboard {
    private ContainerInterface $container;

    private const PAGADO_HABITACION = "(SELECT reserva_habitacion_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                                         FROM pagos WHERE estado = 'VIGENTE' AND reserva_habitacion_id IS NOT NULL
                                        GROUP BY reserva_habitacion_id)";

    private const PAGADO_TOUR = "(SELECT reserva_tour_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                                   FROM pagos WHERE estado = 'VIGENTE' AND reserva_tour_id IS NOT NULL
                                  GROUP BY reserva_tour_id)";

    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }

    public function resumen(Request $request, Response $response, array $args): Response {
        $fecha = trim((string) ($request->getQueryParams()['fecha'] ?? ''));
        $dia = \DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
        if ($dia === false || $dia->format('Y-m-d') !== $fecha) {
            return $this->json($response, ['error' => 'Debe indicar una fecha válida (AAAA-MM-DD).'], 422);
        }

        $this->container->get('eloquent');
        TourProgramado::actualizarEstados();

        $semana = $dia->modify('+6 days')->format('Y-m-d');
        $inicioMes = $dia->format('Y-m-01');
        $haceSeis = $dia->modify('-6 days')->format('Y-m-d');

        $llegadas = Capsule::select(
            "SELECT rh.id, rh.codigo, CONCAT(c.nombre, ' ', c.apellidos) AS cliente, h.numero AS habitacion,
                    th.nombre AS tipo, rh.huespedes, rh.fecha_salida, rh.estado, rh.total, COALESCE(p.pagado, 0) AS pagado
               FROM reservas_habitacion rh
               JOIN usuarios c ON c.id = rh.cliente_id
               JOIN habitaciones h ON h.id = rh.habitacion_id
               JOIN tipos_habitacion th ON th.id = h.tipo_habitacion_id
               LEFT JOIN " . self::PAGADO_HABITACION . " p ON p.reserva_habitacion_id = rh.id
              WHERE rh.fecha_entrada = ? AND rh.estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO')
              ORDER BY rh.estado = 'EN_CURSO', h.numero",
            [$fecha]);

        $salidas = Capsule::select(
            "SELECT rh.id, rh.codigo, CONCAT(c.nombre, ' ', c.apellidos) AS cliente, h.numero AS habitacion,
                    th.nombre AS tipo, rh.huespedes, rh.fecha_entrada, rh.estado, rh.total, COALESCE(p.pagado, 0) AS pagado
               FROM reservas_habitacion rh
               JOIN usuarios c ON c.id = rh.cliente_id
               JOIN habitaciones h ON h.id = rh.habitacion_id
               JOIN tipos_habitacion th ON th.id = h.tipo_habitacion_id
               LEFT JOIN " . self::PAGADO_HABITACION . " p ON p.reserva_habitacion_id = rh.id
              WHERE rh.fecha_salida = ? AND rh.estado IN ('EN_CURSO', 'FINALIZADA')
              ORDER BY rh.estado = 'FINALIZADA', h.numero",
            [$fecha]);

        $estados = Capsule::select("SELECT estado, COUNT(*) AS cantidad FROM habitaciones GROUP BY estado");
        $porEstado = ['DISPONIBLE' => 0, 'MANTENIMIENTO' => 0, 'FUERA_SERVICIO' => 0];
        foreach ($estados as $fila) {
            $porEstado[$fila->estado] = (int) $fila->cantidad;
        }

        $ocupadas = Capsule::selectOne(
            "SELECT COUNT(DISTINCT habitacion_id) AS ocupadas
               FROM reservas_habitacion
              WHERE estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO') AND fecha_entrada <= ? AND fecha_salida > ?",
            [$fecha, $fecha]);

        $enCasa = Capsule::selectOne(
            "SELECT COUNT(*) AS reservas, COALESCE(SUM(huespedes), 0) AS huespedes
               FROM reservas_habitacion WHERE estado = 'EN_CURSO'");

        $ocupacionSemana = [];
        for ($i = 0; $i < 7; $i++) {
            $diaSemana = $dia->modify("+{$i} days")->format('Y-m-d');
            $fila = Capsule::selectOne(
                "SELECT COUNT(DISTINCT habitacion_id) AS ocupadas
                   FROM reservas_habitacion
                  WHERE estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO') AND fecha_entrada <= ? AND fecha_salida > ?",
                [$diaSemana, $diaSemana]);
            $ocupacionSemana[] = ['fecha' => $diaSemana, 'ocupadas' => (int) $fila->ocupadas];
        }

        $toursHoy = Capsule::select(
            "SELECT tp.id, t.nombre AS tour, tp.fecha_hora_inicio, tp.estado, tp.cupo, g.nombre AS guia,
                    t.punto_encuentro,
                    COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.personas END), 0) AS reservados
               FROM tours_programados tp
               JOIN tours t ON t.id = tp.tour_id
               LEFT JOIN guias g ON g.id = tp.guia_id
               LEFT JOIN reservas_tour rt ON rt.tour_programado_id = tp.id
              WHERE DATE(tp.fecha_hora_inicio) = ? AND tp.estado <> 'CANCELADO'
              GROUP BY tp.id, t.nombre, tp.fecha_hora_inicio, tp.estado, tp.cupo, g.nombre, t.punto_encuentro
              ORDER BY tp.fecha_hora_inicio",
            [$fecha]);

        $cobradoHoy = Capsule::selectOne(
            "SELECT COUNT(*) AS pagos, COALESCE(SUM(ROUND(monto * tipo_cambio, 2)), 0) AS total
               FROM pagos WHERE estado = 'VIGENTE' AND DATE(pagado_at) = ?",
            [$fecha]);

        $cobradoMes = Capsule::selectOne(
            "SELECT COUNT(*) AS pagos, COALESCE(SUM(ROUND(monto * tipo_cambio, 2)), 0) AS total
               FROM pagos WHERE estado = 'VIGENTE' AND DATE(pagado_at) BETWEEN ? AND ?",
            [$inicioMes, $fecha]);

        $cobrosPorDia = Capsule::select(
            "SELECT DATE(pagado_at) AS fecha, COALESCE(SUM(ROUND(monto * tipo_cambio, 2)), 0) AS total
               FROM pagos WHERE estado = 'VIGENTE' AND DATE(pagado_at) BETWEEN ? AND ?
              GROUP BY DATE(pagado_at)",
            [$haceSeis, $fecha]);
        $totales = [];
        foreach ($cobrosPorDia as $fila) {
            $totales[$fila->fecha] = (float) $fila->total;
        }
        $cobrosSemana = [];
        for ($i = 6; $i >= 0; $i--) {
            $diaCobro = $dia->modify("-{$i} days")->format('Y-m-d');
            $cobrosSemana[] = ['fecha' => $diaCobro, 'total' => $totales[$diaCobro] ?? 0];
        }

        $saldoHospedaje = Capsule::selectOne(
            "SELECT COUNT(*) AS reservas, COALESCE(SUM(rh.total - COALESCE(p.pagado, 0)), 0) AS saldo
               FROM reservas_habitacion rh
               LEFT JOIN " . self::PAGADO_HABITACION . " p ON p.reserva_habitacion_id = rh.id
              WHERE rh.estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO') AND rh.total - COALESCE(p.pagado, 0) > 0");

        $saldoTours = Capsule::selectOne(
            "SELECT COUNT(*) AS reservas, COALESCE(SUM(rt.total - COALESCE(p.pagado, 0)), 0) AS saldo
               FROM reservas_tour rt
               LEFT JOIN " . self::PAGADO_TOUR . " p ON p.reserva_tour_id = rt.id
              WHERE rt.estado IN ('PENDIENTE', 'CONFIRMADA') AND rt.total - COALESCE(p.pagado, 0) > 0");

        $porCobrar = Capsule::select(
            "SELECT rh.id, rh.codigo, CONCAT(c.nombre, ' ', c.apellidos) AS cliente, rh.cliente_id, h.numero AS habitacion,
                    rh.fecha_entrada, rh.estado, rh.total, COALESCE(p.pagado, 0) AS pagado
               FROM reservas_habitacion rh
               JOIN usuarios c ON c.id = rh.cliente_id
               JOIN habitaciones h ON h.id = rh.habitacion_id
               LEFT JOIN " . self::PAGADO_HABITACION . " p ON p.reserva_habitacion_id = rh.id
              WHERE rh.estado IN ('PENDIENTE', 'CONFIRMADA') AND rh.fecha_entrada BETWEEN ? AND ?
                AND rh.total - COALESCE(p.pagado, 0) > 0
              ORDER BY rh.fecha_entrada, h.numero
              LIMIT 8",
            [$fecha, $semana]);

        return $this->json($response, ['data' => [
            'fecha' => $fecha,
            'habitaciones' => [
                'total' => array_sum($porEstado),
                'disponibles' => $porEstado['DISPONIBLE'],
                'mantenimiento' => $porEstado['MANTENIMIENTO'],
                'fuera_servicio' => $porEstado['FUERA_SERVICIO'],
                'ocupadas' => (int) $ocupadas->ocupadas,
            ],
            'en_casa' => ['reservas' => (int) $enCasa->reservas, 'huespedes' => (int) $enCasa->huespedes],
            'llegadas' => $llegadas,
            'salidas' => $salidas,
            'ocupacion_semana' => $ocupacionSemana,
            'tours_hoy' => $toursHoy,
            'cobrado_hoy' => ['pagos' => (int) $cobradoHoy->pagos, 'total' => (float) $cobradoHoy->total],
            'cobrado_mes' => ['pagos' => (int) $cobradoMes->pagos, 'total' => (float) $cobradoMes->total],
            'cobros_semana' => $cobrosSemana,
            'saldo_pendiente' => [
                'hospedaje' => ['reservas' => (int) $saldoHospedaje->reservas, 'saldo' => (float) $saldoHospedaje->saldo],
                'tours' => ['reservas' => (int) $saldoTours->reservas, 'saldo' => (float) $saldoTours->saldo],
            ],
            'por_cobrar' => $porCobrar,
        ]], 200);
    }

    private function json(Response $response, array $payload, int $status): Response{
        $response->getBody()->write(json_encode($payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type', 'application/json; charset=UTF-8')
            ->withStatus($status);
    }
}
