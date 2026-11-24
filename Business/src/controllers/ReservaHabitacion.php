<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use App\Services\DataService;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use App\Validators\ReservaHabitacionValidator;
use App\Validators\ReglaNegocioException;
use App\Services\RolMiddleware;

class ReservaHabitacion {

    #Si cambia alguno de estos campos se vuelven a revisar las reglas de negocio
    private const CAMPOS_CON_REGLAS = ['habitacion_id', 'fecha_entrada', 'fecha_salida', 'huespedes', 'estado'];

    public function __construct(private ContainerInterface $container){}

    public function read(Request $request, Response $response, array $args): Response {
        try {
            $esCliente = RolMiddleware::rolDe($request) === RolMiddleware::CLIENTE;

            #El cliente no puede listar todas las reservas, solo las suyas mediante el filtro
            if ($esCliente && !isset($args['id'])) {
                return $this->json($response, ['error' => 'Use el filtro para consultar sus reservas.'], 403);
            }

            $dataservice = $this->container->get(DataService::class);
            $path = isset($args['id']) ? 'reservas-habitacion/' . rawurlencode($args['id']) : 'reservas-habitacion';
            $upstream = $dataservice->get($path);
            $contenido = (string) $upstream->getBody();

            if ($esCliente && $upstream->getStatusCode() === 200) {
                $reserva = json_decode($contenido, true);
                if ((int) ($reserva['data']['cliente_id'] ?? 0) !== RolMiddleware::usuarioDe($request)) {
                    return $this->json($response, ['error' => 'No tiene permisos para ver esta reserva.'], 403);
                }
            }

            $response->getBody()->write($contenido);
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
                'codigo' => trim((string) ($params['codigo'] ?? '')),
                'cliente' => trim((string) ($params['cliente'] ?? '')),
                'estado' => trim((string) ($params['estado'] ?? '')),
                'cliente_id' => trim((string) ($params['cliente_id'] ?? '')),
                'habitacion_id' => trim((string) ($params['habitacion_id'] ?? '')),
                'fecha_entrada' => trim((string) ($params['fecha_entrada'] ?? '')),
                'fecha_salida' => trim((string) ($params['fecha_salida'] ?? '')),
                'entrada_antes_de' => trim((string) ($params['entrada_antes_de'] ?? '')),
                'salida_despues_de' => trim((string) ($params['salida_despues_de'] ?? ''))
            ];

            #El cliente solo puede ver sus propias reservas
            if (RolMiddleware::rolDe($request) === RolMiddleware::CLIENTE) {
                $query['cliente_id'] = (string) RolMiddleware::usuarioDe($request);
            }

            $dataservice = $this->container->get(DataService::class);
            $upstream = $dataservice->get('reservas-habitacion/filter/' . $offset . '/' . $limit, $query);

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

            #El cliente siempre reserva a su nombre; si reserva el personal, queda registrado quién lo hizo
            if (RolMiddleware::rolDe($request) === RolMiddleware::CLIENTE) {
                $data['cliente_id'] = RolMiddleware::usuarioDe($request);
                $data['estado'] = 'PENDIENTE';
            } elseif (!isset($data['registrada_por']) || $data['registrada_por'] === '') {
                $data['registrada_por'] = RolMiddleware::usuarioDe($request);
            }

            $dataservice = $this->container->get(DataService::class);

            if (!isset($data['codigo']) || $data['codigo'] === '') {
                $data['codigo'] = $this->siguienteCodigo($dataservice);
            }

            #Validación en la capa de negocio: si falla, no se consume la capa de datos
            $errors = (new ReservaHabitacionValidator())->validate($data);
            if ($errors !== []) {
                return $this->json($response, ['errors' => $errors], 400);
            }

            #Reglas de negocio: fechas, disponibilidad, capacidad y cálculo del total
            $data = (new ReservaHabitacionValidator())->aplicarReglas($dataservice, $data);

            $upstream = $dataservice->post('reservas-habitacion', json_encode($data, JSON_THROW_ON_ERROR));

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

            #El precio y el total no se modifican a mano, los calcula la capa de negocio
            unset($data['precio_noche'], $data['total']);

            #Validación parcial: solo se revisan los campos que vienen en la petición
            $errors = (new ReservaHabitacionValidator())->validate($data, true);
            if ($errors !== []) {
                return $this->json($response, ['errors' => $errors], 400);
            }

            $dataservice = $this->container->get(DataService::class);

            if (array_intersect(self::CAMPOS_CON_REGLAS, array_keys($data)) !== []) {
                $anterior = $dataservice->obtener('reservas-habitacion/' . rawurlencode($args['id']));
                if ($anterior === null) {
                    return $this->json($response, ['error' => 'Reserva de habitación no encontrada.'], 404);
                }
                $anterior = $anterior['data'];

                #Se revisan las reglas con la reserva completa: lo que había más los cambios
                $completa = (new ReservaHabitacionValidator())->aplicarReglas($dataservice, array_merge($anterior, $data), $anterior);
                $data['precio_noche'] = $completa['precio_noche'];
                $data['total'] = $completa['total'];
            }

            $upstream = $dataservice->put('reservas-habitacion/' . rawurlencode($args['id']), json_encode($data, JSON_THROW_ON_ERROR));

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
            $upstream = $dataservice->delete('reservas-habitacion/' . rawurlencode($args['id']));

            return $this->json($response, json_decode((string) $upstream->getBody(), true), $upstream->getStatusCode());

        }catch (ConnectException){
            return $this->json($response, ['error' => 'El servicio de datos no está disponible'], 502);
        }
        catch (RequestException){
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos'], 502);
        }
    }

    private function siguienteCodigo(DataService $dataservice): string {
        $mayor = 0;
        foreach ($dataservice->obtenerTodos('reservas-habitacion') as $reserva) {
            if (preg_match('/^RH-(\d+)$/', (string) ($reserva['codigo'] ?? ''), $partes)) {
                $mayor = max($mayor, (int) $partes[1]);
            }
        }
        return sprintf('RH-%04d', $mayor + 1);
    }

    private function json(Response $response, array $payload, int $status): Response{
        $response->getBody()->write(json_encode($payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return $response
            ->withHeader('Content-Type','application/json; charset=utf-8')
            ->withStatus($status);
    }

}
