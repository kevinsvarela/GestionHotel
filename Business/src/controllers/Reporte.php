<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use App\Services\DataService;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use DateTimeImmutable;

class Reporte {

    private const TIPOS = ['ingresos', 'ocupacion', 'reservas', 'tours'];
    private const MAXIMO_DIAS = 366;

    public function __construct(private ContainerInterface $container){}

    public function generar(Request $request, Response $response, array $args): Response {
        $tipo = (string) ($args['tipo'] ?? '');
        if (!in_array($tipo, self::TIPOS, true)) {
            return $this->json($response, ['error' => 'El reporte solicitado no existe.'], 404);
        }

        $params = $request->getQueryParams();
        $desde = trim((string) ($params['desde'] ?? ''));
        $hasta = trim((string) ($params['hasta'] ?? ''));

        $errores = $this->validarRango($desde, $hasta);
        if ($errores !== []) {
            return $this->json($response, ['errors' => $errores], 400);
        }

        try {
            $dataservice = $this->container->get(DataService::class);
            $upstream = $dataservice->get('reportes/' . $tipo, ['desde' => $desde, 'hasta' => $hasta]);

            $response->getBody()->write((string) $upstream->getBody());
            return $response
                ->withHeader(
                    'Content-Type', $upstream->getHeaderLine('Content-Type') ? : 'application/json; charset=utf-8')
                ->withStatus($upstream->getStatusCode());
        }catch (ConnectException){
            return $this->json($response, ['error' => 'El servicio de datos no está disponible'], 502);
        }
        catch (RequestException){
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos'], 502);
        }
    }

    private function validarRango(string $desde, string $hasta): array {
        $errores = [];
        $fechaDesde = DateTimeImmutable::createFromFormat('!Y-m-d', $desde);
        $fechaHasta = DateTimeImmutable::createFromFormat('!Y-m-d', $hasta);

        if ($fechaDesde === false || $fechaDesde->format('Y-m-d') !== $desde) {
            $errores['desde'] = 'La fecha inicial es obligatoria y debe tener el formato AAAA-MM-DD.';
        }
        if ($fechaHasta === false || $fechaHasta->format('Y-m-d') !== $hasta) {
            $errores['hasta'] = 'La fecha final es obligatoria y debe tener el formato AAAA-MM-DD.';
        }
        if ($errores !== []) {
            return $errores;
        }
        if ($fechaDesde > $fechaHasta) {
            $errores['hasta'] = 'La fecha final no puede ser anterior a la inicial.';
        } elseif ($fechaDesde->diff($fechaHasta)->days + 1 > self::MAXIMO_DIAS) {
            $errores['hasta'] = 'El rango no puede ser mayor a un año.';
        }
        return $errores;
    }

    private function json(Response $response, array $payload, int $status): Response{
        $response->getBody()->write(json_encode($payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type','application/json; charset=utf-8')
            ->withStatus($status);
    }
}
