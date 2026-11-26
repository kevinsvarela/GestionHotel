<?php

namespace App\controllers;

use Illuminate\Database\Capsule\Manager as Capsule;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;

class Reporte {
    private ContainerInterface $container;

    private const ORDEN_ESTADOS = "'PENDIENTE','CONFIRMADA','EN_CURSO','FINALIZADA','CANCELADA'";

    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }

    public function ingresos(Request $request, Response $response, array $args): Response {
        $rango = $this->rango($request);
        if ($rango === null) {
            return $this->rangoInvalido($response);
        }
        [$desde, $hasta] = $rango;
        $this->container->get('eloquent');

        $resumen = Capsule::select(
            "SELECT p.metodo, p.moneda, COUNT(*) AS cantidad, SUM(p.monto) AS total_moneda,
                    SUM(ROUND(p.monto * p.tipo_cambio, 2)) AS total_crc
               FROM pagos p
              WHERE p.estado = 'VIGENTE' AND DATE(p.pagado_at) BETWEEN ? AND ?
              GROUP BY p.metodo, p.moneda
              ORDER BY FIELD(p.metodo, 'EFECTIVO', 'TARJETA', 'SINPE'), p.moneda",
            [$desde, $hasta]);

        $detalle = Capsule::select(
            "SELECT p.id, p.pagado_at, COALESCE(rh.codigo, rt.codigo) AS codigo_reserva,
                    CONCAT(c.nombre, ' ', c.apellidos) AS cliente, p.metodo, p.moneda, p.monto, p.tipo_cambio,
                    ROUND(p.monto * p.tipo_cambio, 2) AS monto_crc, p.referencia
               FROM pagos p
               LEFT JOIN reservas_habitacion rh ON rh.id = p.reserva_habitacion_id
               LEFT JOIN reservas_tour rt ON rt.id = p.reserva_tour_id
               LEFT JOIN usuarios c ON c.id = COALESCE(rh.cliente_id, rt.cliente_id)
              WHERE p.estado = 'VIGENTE' AND DATE(p.pagado_at) BETWEEN ? AND ?
              ORDER BY p.pagado_at",
            [$desde, $hasta]);

        return $this->json($response, ['data' => [
            'reporte' => 'ingresos',
            'desde' => $desde,
            'hasta' => $hasta,
            'resumen' => $resumen,
            'detalle' => $detalle,
        ]], 200);
    }

    public function ocupacion(Request $request, Response $response, array $args): Response {
        $rango = $this->rango($request);
        if ($rango === null) {
            return $this->rangoInvalido($response);
        }
        [$desde, $hasta] = $rango;
        $this->container->get('eloquent');

        $noches = "GREATEST(DATEDIFF(LEAST(rh.fecha_salida, DATE_ADD(?, INTERVAL 1 DAY)), GREATEST(rh.fecha_entrada, ?)), 0)";

        $filas = Capsule::select(
            "SELECT th.id, th.nombre, COUNT(DISTINCT h.id) AS habitaciones, COUNT(DISTINCT rh.id) AS reservas,
                    COALESCE(SUM($noches), 0) AS noches_ocupadas,
                    COALESCE(SUM($noches * rh.precio_noche), 0) AS ingreso_estimado
               FROM tipos_habitacion th
               LEFT JOIN habitaciones h ON h.tipo_habitacion_id = th.id
               LEFT JOIN reservas_habitacion rh ON rh.habitacion_id = h.id
                     AND rh.estado <> 'CANCELADA'
                     AND rh.fecha_entrada <= ? AND rh.fecha_salida > ?
              GROUP BY th.id, th.nombre
              ORDER BY th.nombre",
            [$hasta, $desde, $hasta, $desde, $hasta, $desde]);

        $nochesRango = (int) (new \DateTimeImmutable($desde))->diff(new \DateTimeImmutable($hasta))->days + 1;

        $filas = array_map(function ($fila) use ($nochesRango) {
            $disponibles = (int) $fila->habitaciones * $nochesRango;
            $fila->noches_disponibles = $disponibles;
            $fila->porcentaje = $disponibles > 0 ? round((float) $fila->noches_ocupadas * 100 / $disponibles, 1) : 0;
            return $fila;
        }, $filas);

        return $this->json($response, ['data' => [
            'reporte' => 'ocupacion',
            'desde' => $desde,
            'hasta' => $hasta,
            'noches_rango' => $nochesRango,
            'tipos' => $filas,
        ]], 200);
    }

    public function reservas(Request $request, Response $response, array $args): Response {
        $rango = $this->rango($request);
        if ($rango === null) {
            return $this->rangoInvalido($response);
        }
        [$desde, $hasta] = $rango;
        $this->container->get('eloquent');

        $hospedaje = Capsule::select(
            "SELECT rh.estado, COUNT(*) AS cantidad, SUM(rh.total) AS total, SUM(COALESCE(p.pagado, 0)) AS pagado,
                    SUM(CASE WHEN rh.estado = 'CANCELADA' THEN 0 ELSE GREATEST(rh.total - COALESCE(p.pagado, 0), 0) END) AS saldo
               FROM reservas_habitacion rh
               LEFT JOIN (SELECT reserva_habitacion_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                            FROM pagos WHERE reserva_habitacion_id IS NOT NULL AND estado = 'VIGENTE'
                           GROUP BY reserva_habitacion_id) p ON p.reserva_habitacion_id = rh.id
              WHERE rh.fecha_entrada BETWEEN ? AND ?
              GROUP BY rh.estado
              ORDER BY FIELD(rh.estado, " . self::ORDEN_ESTADOS . ")",
            [$desde, $hasta]);

        $tours = Capsule::select(
            "SELECT rt.estado, COUNT(*) AS cantidad, SUM(rt.total) AS total, SUM(COALESCE(p.pagado, 0)) AS pagado,
                    SUM(CASE WHEN rt.estado = 'CANCELADA' THEN 0 ELSE GREATEST(rt.total - COALESCE(p.pagado, 0), 0) END) AS saldo
               FROM reservas_tour rt
               JOIN tours_programados tp ON tp.id = rt.tour_programado_id
               LEFT JOIN (SELECT reserva_tour_id, SUM(ROUND(monto * tipo_cambio, 2)) AS pagado
                            FROM pagos WHERE reserva_tour_id IS NOT NULL AND estado = 'VIGENTE'
                           GROUP BY reserva_tour_id) p ON p.reserva_tour_id = rt.id
              WHERE DATE(tp.fecha_hora_inicio) BETWEEN ? AND ?
              GROUP BY rt.estado
              ORDER BY FIELD(rt.estado, " . self::ORDEN_ESTADOS . ")",
            [$desde, $hasta]);

        return $this->json($response, ['data' => [
            'reporte' => 'reservas',
            'desde' => $desde,
            'hasta' => $hasta,
            'hospedaje' => $hospedaje,
            'tours' => $tours,
        ]], 200);
    }

    public function tours(Request $request, Response $response, array $args): Response {
        $rango = $this->rango($request);
        if ($rango === null) {
            return $this->rangoInvalido($response);
        }
        [$desde, $hasta] = $rango;
        $this->container->get('eloquent');

        $salidas = "SELECT tp.id, tp.tour_id, tp.guia_id, tp.cupo,
                           COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.personas END), 0) AS personas,
                           COALESCE(SUM(CASE WHEN rt.estado <> 'CANCELADA' THEN rt.total END), 0) AS vendido
                      FROM tours_programados tp
                      LEFT JOIN reservas_tour rt ON rt.tour_programado_id = tp.id
                     WHERE tp.estado <> 'CANCELADO' AND DATE(tp.fecha_hora_inicio) BETWEEN ? AND ?
                     GROUP BY tp.id, tp.tour_id, tp.guia_id, tp.cupo";

        $porTour = Capsule::select(
            "SELECT t.id, t.nombre, COUNT(s.id) AS salidas, COALESCE(SUM(s.cupo), 0) AS cupo,
                    COALESCE(SUM(s.personas), 0) AS personas, COALESCE(SUM(s.vendido), 0) AS vendido
               FROM tours t
               LEFT JOIN ($salidas) s ON s.tour_id = t.id
              GROUP BY t.id, t.nombre
              ORDER BY personas DESC, t.nombre",
            [$desde, $hasta]);

        $porGuia = Capsule::select(
            "SELECT s.guia_id, COALESCE(g.nombre, 'Sin guía asignado') AS nombre, COUNT(s.id) AS salidas,
                    SUM(s.personas) AS personas, SUM(s.vendido) AS vendido
               FROM ($salidas) s
               LEFT JOIN guias g ON g.id = s.guia_id
              GROUP BY s.guia_id, g.nombre
              ORDER BY personas DESC, nombre",
            [$desde, $hasta]);

        $calcular = function ($fila) {
            $fila->ocupacion = (int) $fila->cupo > 0 ? round((float) $fila->personas * 100 / (int) $fila->cupo, 1) : 0;
            return $fila;
        };

        return $this->json($response, ['data' => [
            'reporte' => 'tours',
            'desde' => $desde,
            'hasta' => $hasta,
            'tours' => array_map($calcular, $porTour),
            'guias' => $porGuia,
        ]], 200);
    }

    private function rango(Request $request): ?array {
        $params = $request->getQueryParams();
        $desde = trim((string) ($params['desde'] ?? ''));
        $hasta = trim((string) ($params['hasta'] ?? ''));
        $fechaDesde = \DateTimeImmutable::createFromFormat('!Y-m-d', $desde);
        $fechaHasta = \DateTimeImmutable::createFromFormat('!Y-m-d', $hasta);
        if ($fechaDesde === false || $fechaHasta === false || $fechaDesde->format('Y-m-d') !== $desde
            || $fechaHasta->format('Y-m-d') !== $hasta || $fechaDesde > $fechaHasta) {
            return null;
        }
        return [$desde, $hasta];
    }

    private function rangoInvalido(Response $response): Response {
        return $this->json($response, ['error' => 'Debe indicar un rango de fechas válido (desde y hasta, AAAA-MM-DD).'], 422);
    }

    private function json(Response $response, array $payload, int $status): Response{
        $response->getBody()->write(json_encode($payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type', 'application/json; charset=UTF-8')
            ->withStatus($status);
    }
}
