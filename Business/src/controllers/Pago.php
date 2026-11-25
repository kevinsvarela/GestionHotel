<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use App\Services\DataService;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use App\Validators\PagoValidator;
use App\Validators\ReglaNegocioException;
use App\Services\RolMiddleware;

class Pago {

    #Si cambia alguno de estos campos se vuelven a revisar las reglas de negocio
    private const CAMPOS_CON_REGLAS = ['reserva_habitacion_id', 'reserva_tour_id'];

    public function __construct(private ContainerInterface $container){}

    public function read(Request $request, Response $response, array $args): Response {
        try {
            $dataservice = $this->container->get(DataService::class);
            $path = isset($args['id']) ? 'pagos/' . rawurlencode($args['id']) : 'pagos';
            $upstream = $dataservice->get($path);

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

    public function filter(Request $request, Response $response, array $args): Response {
        $offset = filter_var($args['offset'] ?? 0, FILTER_VALIDATE_INT);
        $limit = filter_var($args['limit'] ?? 20, FILTER_VALIDATE_INT);

        if($offset === false || $offset < 0 || $limit === false || $limit < 1 || $limit > 100){
            return $this->json($response,
                ['error' => 'El offset debe ser mayor o igual 0 y el límite debe estar entre 1 y 100.'], 422);
        }

        try {
            $params = $request->getQueryParams();

            #Se envían siempre todas las llaves para que la capa de datos no reciba parámetros indefinidos
            $query = [
                'metodo' => trim((string) ($params['metodo'] ?? '')),
                'referencia' => trim((string) ($params['referencia'] ?? '')),
                'moneda' => trim((string) ($params['moneda'] ?? '')),
                'fecha' => trim((string) ($params['fecha'] ?? '')),
                'registrado_por' => trim((string) ($params['registrado_por'] ?? '')),
                'reserva_habitacion_id' => trim((string) ($params['reserva_habitacion_id'] ?? '')),
                'reserva_tour_id' => trim((string) ($params['reserva_tour_id'] ?? '')),
                'codigo' => trim((string) ($params['codigo'] ?? '')),
                'cliente' => trim((string) ($params['cliente'] ?? ''))
            ];

            $dataservice = $this->container->get(DataService::class);
            $upstream = $dataservice->get('pagos/filter/' . $offset . '/' . $limit, $query);

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

    public function create(Request $request, Response $response, array $args): Response {
        try {
            $request->getBody()->rewind();
            $body = (string) $request->getBody();

            $data = json_decode($body, true);

            if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
                return $this->json($response, ['errors' => ['body' => 'Debe enviar un objeto JSON válido']], 400);
            }

            #Si no se indica, el pago queda registrado a nombre de quien inició sesión
            if (!isset($data['registrado_por']) || $data['registrado_por'] === '') {
                $data['registrado_por'] = RolMiddleware::usuarioDe($request);
            }

            #Validación en la capa de negocio: si falla, no se consume la capa de datos
            $errors = (new PagoValidator())->validate($data);
            if ($errors !== []) {
                return $this->json($response, ['errors' => $errors], 400);
            }

            $dataservice = $this->container->get(DataService::class);

            #Reglas de negocio: una sola reserva, que exista y que no esté cancelada
            (new PagoValidator())->aplicarReglas($dataservice, $data);

            $upstream = $dataservice->post('pagos', json_encode($data, JSON_THROW_ON_ERROR));

            return $this->json($response, json_decode((string) $upstream->getBody(), true), $upstream->getStatusCode());
        }catch (ReglaNegocioException $e){
            return $this->json($response, ['error' => $e->getMessage()], $e->getStatus());
        }
        catch (ConnectException){
            return $this->json($response, ['error' => 'El servicio de datos no está disponible'], 502);
        }
        catch (RequestException){
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos'], 502);
        }
    }

    public function update(Request $request, Response $response, array $args): Response {
        try {
            $request->getBody()->rewind();
            $body = (string) $request->getBody();

            $data = json_decode($body, true);

            if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
                return $this->json($response, ['errors' => ['body' => 'Debe enviar un objeto JSON válido']], 400);
            }

            #Validación parcial: solo se revisan los campos que vienen en la petición
            $errors = (new PagoValidator())->validate($data, true);
            if ($errors !== []) {
                return $this->json($response, ['errors' => $errors], 400);
            }

            $dataservice = $this->container->get(DataService::class);

            if (array_intersect(self::CAMPOS_CON_REGLAS, array_keys($data)) !== []) {
                $anterior = $dataservice->obtener('pagos/' . rawurlencode($args['id']));
                if ($anterior === null) {
                    return $this->json($response, ['error' => 'Pago no encontrado.'], 404);
                }
                $anterior = $anterior['data'];

                #Se revisan las reglas con el registro completo: lo que había más los cambios
                (new PagoValidator())->aplicarReglas($dataservice, array_merge($anterior, $data));
            }

            $upstream = $dataservice->put('pagos/' . rawurlencode($args['id']), json_encode($data, JSON_THROW_ON_ERROR));

            return $this->json($response, json_decode((string) $upstream->getBody(), true), $upstream->getStatusCode());

        }catch (ReglaNegocioException $e){
            return $this->json($response, ['error' => $e->getMessage()], $e->getStatus());
        }
        catch (ConnectException){
            return $this->json($response, ['error' => 'El servicio de datos no está disponible'], 502);
        }
        catch (RequestException){
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos'], 502);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response {
        try {
            $dataservice = $this->container->get(DataService::class);
            $upstream = $dataservice->delete('pagos/' . rawurlencode($args['id']));

            return $this->json($response, json_decode((string) $upstream->getBody(), true), $upstream->getStatusCode());

        }catch (ConnectException){
            return $this->json($response, ['error' => 'El servicio de datos no está disponible'], 502);
        }
        catch (RequestException){
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos'], 502);
        }
    }

    private function json(Response $response, array $payload, int $status): Response{
        $response->getBody()->write(json_encode($payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type','application/json; charset=utf-8')
            ->withStatus($status);
    }

}
