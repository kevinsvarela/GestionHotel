<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;

class Dashboard {
    private ContainerInterface $container;

    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }

    public function resumen(Request $request, Response $response, array $args): Response {
        $fecha = trim((string) ($request->getQueryParams()['fecha'] ?? ''));
        $dia = \DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
        if ($dia === false || $dia->format('Y-m-d') !== $fecha) {
            return $this->json($response, ['error' => 'Debe indicar una fecha válida (AAAA-MM-DD).'], 422);
        }

        $eloquent = $this->container->get('eloquent');
        TourProgramado::actualizarEstados();

        $semana = $dia->modify('+6 days')->format('Y-m-d');
        $inicioMes = $dia->format('Y-m-01');
        $haceSeis = $dia->modify('-6 days')->format('Y-m-d');

        $llegadas = $eloquent->connection()->select('CALL sp_obtener_llegadas_dia(?)', [$fecha]);

        $salidas = $eloquent->connection()->select('CALL sp_obtener_salidas_dia(?)', [$fecha]);

        $estados = $eloquent->connection()->select('CALL sp_contar_habitaciones_estado()');
        $porEstado = ['DISPONIBLE' => 0, 'MANTENIMIENTO' => 0, 'FUERA_SERVICIO' => 0];
        foreach ($estados as $fila) {
            $porEstado[$fila->estado] = (int) $fila->cantidad;
        }

        $ocupadas = $eloquent->connection()->selectOne('CALL sp_contar_habitaciones_ocupadas(?)', [$fecha]);

        $enCasa = $eloquent->connection()->selectOne('CALL sp_obtener_huespedes_en_casa()');

        $ocupacionSemana = [];
        for ($i = 0; $i < 7; $i++) {
            $diaSemana = $dia->modify("+{$i} days")->format('Y-m-d');
            $fila = $eloquent->connection()->selectOne('CALL sp_contar_habitaciones_ocupadas(?)', [$diaSemana]);
            $ocupacionSemana[] = ['fecha' => $diaSemana, 'ocupadas' => (int) $fila->ocupadas];
        }

        $toursHoy = $eloquent->connection()->select('CALL sp_obtener_tours_dia(?)', [$fecha]);

        $cobradoHoy = $eloquent->connection()->selectOne('CALL sp_obtener_cobros_rango(?, ?)', [$fecha, $fecha]);

        $cobradoMes = $eloquent->connection()->selectOne('CALL sp_obtener_cobros_rango(?, ?)', [$inicioMes, $fecha]);

        $cobrosPorDia = $eloquent->connection()->select('CALL sp_obtener_cobros_por_dia(?, ?)', [$haceSeis, $fecha]);
        $totales = [];
        foreach ($cobrosPorDia as $fila) {
            $totales[$fila->fecha] = (float) $fila->total;
        }
        $cobrosSemana = [];
        for ($i = 6; $i >= 0; $i--) {
            $diaCobro = $dia->modify("-{$i} days")->format('Y-m-d');
            $cobrosSemana[] = ['fecha' => $diaCobro, 'total' => $totales[$diaCobro] ?? 0];
        }

        $saldoHospedaje = $eloquent->connection()->selectOne('CALL sp_obtener_saldo_hospedaje()');

        $saldoTours = $eloquent->connection()->selectOne('CALL sp_obtener_saldo_tours()');

        $porCobrar = $eloquent->connection()->select('CALL sp_obtener_reservas_por_cobrar(?, ?)', [$fecha, $semana]);

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
