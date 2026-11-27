<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;

class Reporte {
    private ContainerInterface $container;

    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }

    public function ingresos(Request $request, Response $response, array $args): Response {
        $rango = $this->rango($request);
        if ($rango === null) {
            return $this->rangoInvalido($response);
        }
        [$desde, $hasta] = $rango;
        $eloquent = $this->container->get('eloquent');

        $resumen = $eloquent->connection()->select('CALL sp_reporte_ingresos_resumen(?, ?)', [$desde, $hasta]);

        $detalle = $eloquent->connection()->select('CALL sp_reporte_ingresos_detalle(?, ?)', [$desde, $hasta]);

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
        $eloquent = $this->container->get('eloquent');

        $filas = $eloquent->connection()->select('CALL sp_reporte_ocupacion(?, ?)', [$desde, $hasta]);

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
        $eloquent = $this->container->get('eloquent');

        $hospedaje = $eloquent->connection()->select('CALL sp_reporte_reservas_hospedaje(?, ?)', [$desde, $hasta]);

        $tours = $eloquent->connection()->select('CALL sp_reporte_reservas_tours(?, ?)', [$desde, $hasta]);

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
        $eloquent = $this->container->get('eloquent');

        $porTour = $eloquent->connection()->select('CALL sp_reporte_tours_por_tour(?, ?)', [$desde, $hasta]);

        $porGuia = $eloquent->connection()->select('CALL sp_reporte_tours_por_guia(?, ?)', [$desde, $hasta]);

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
