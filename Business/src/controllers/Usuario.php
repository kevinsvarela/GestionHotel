<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
use App\Services\DataService;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use App\Validators\UsuarioValidator;
use App\Services\RolMiddleware;

class Usuario {

    public function __construct(private ContainerInterface $container){}

    public function read(Request $request, Response $response, array $args): Response {
        try {
            $dataservice = $this->container->get(DataService::class);
            $path = isset($args['id']) ? 'usuarios/' . rawurlencode($args['id']) : 'usuarios';
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
                'nombre' => trim((string) ($params['nombre'] ?? '')),
                'apellidos' => trim((string) ($params['apellidos'] ?? '')),
                'email' => trim((string) ($params['email'] ?? '')),
                'identificacion' => trim((string) ($params['identificacion'] ?? '')),
                'username' => trim((string) ($params['username'] ?? '')),
                'telefono' => trim((string) ($params['telefono'] ?? '')),
                'rol' => trim((string) ($params['rol'] ?? '')),
                'rol_id' => trim((string) ($params['rol_id'] ?? '')),
                'activo' => trim((string) ($params['activo'] ?? ''))
            ];

            $dataservice = $this->container->get(DataService::class);
            $upstream = $dataservice->get('usuarios/filter/' . $offset . '/' . $limit, $query);

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

            #La recepcionista solo puede registrar clientes
            if (RolMiddleware::rolDe($request) === RolMiddleware::RECEPCIONISTA
                && (int) ($data['rol_id'] ?? 0) !== RolMiddleware::CLIENTE) {
                return $this->json($response, ['error' => 'La recepcionista solo puede registrar usuarios con rol de cliente.'], 403);
            }

            #Validación en la capa de negocio: si falla, no se consume la capa de datos
            $errors = (new UsuarioValidator())->validate($data);
            if ($errors !== []) {
                return $this->json($response, ['errors' => $errors], 400);
            }

            $dataservice = $this->container->get(DataService::class);
            $upstream = $dataservice->post('usuarios', json_encode($data, JSON_THROW_ON_ERROR));

            return $this->json($response, json_decode((string) $upstream->getBody(), true), $upstream->getStatusCode());
        }catch (ConnectException){
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
            $errors = (new UsuarioValidator())->validate($data, true);
            if ($errors !== []) {
                return $this->json($response, ['errors' => $errors], 400);
            }

            $dataservice = $this->container->get(DataService::class);

            #La recepcionista solo puede modificar clientes y no puede cambiarles el rol
            if (RolMiddleware::rolDe($request) === RolMiddleware::RECEPCIONISTA) {
                $usuario = $dataservice->obtener('usuarios/' . rawurlencode($args['id']));
                if ($usuario === null) {
                    return $this->json($response, ['error' => 'Usuario no encontrado.'], 404);
                }
                if ((int) $usuario['data']['rol_id'] !== RolMiddleware::CLIENTE
                    || (isset($data['rol_id']) && (int) $data['rol_id'] !== RolMiddleware::CLIENTE)) {
                    return $this->json($response, ['error' => 'La recepcionista solo puede modificar usuarios con rol de cliente.'], 403);
                }
            }

            $upstream = $dataservice->put('usuarios/' . rawurlencode($args['id']), json_encode($data, JSON_THROW_ON_ERROR));

            return $this->json($response, json_decode((string) $upstream->getBody(), true), $upstream->getStatusCode());

        }catch (ConnectException){
            return $this->json($response, ['error' => 'El servicio de datos no está disponible'], 502);
        }
        catch (RequestException){
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos'], 502);
        }
    }

    public function delete(Request $request, Response $response, array $args): Response {
        try {
            $dataservice = $this->container->get(DataService::class);
            $upstream = $dataservice->delete('usuarios/' . rawurlencode($args['id']));

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
