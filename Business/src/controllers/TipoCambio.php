<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;

class TipoCambio {

    public const COMPRA = 440.90;
    public const VENTA = 445.20;

    public function __construct(private ContainerInterface $container){}

    public static function aplicado(): float {
        return self::COMPRA;
    }

    public static function paraMoneda(string $moneda): float {
        return $moneda === 'USD' ? self::aplicado() : 1.0;
    }

    public function hoy(Request $request, Response $response, array $args): Response {
        $fecha = new \DateTimeImmutable('now', new \DateTimeZone('America/Costa_Rica'));

        $response->getBody()->write(json_encode(['data' => [
            'fecha' => $fecha->format('Y-m-d'),
            'compra' => self::COMPRA,
            'venta' => self::VENTA,
            'aplicado' => self::aplicado(),
            'fuente' => 'SIMULADO',
        ]], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type','application/json; charset=utf-8')
            ->withStatus(200);
    }
}
