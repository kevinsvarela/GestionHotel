<?php

declare(strict_types=1);

namespace App\controllers;

use App\Services\DataService;
use App\Services\RolMiddleware;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class Auth extends Tokens {
    public function __construct(ContainerInterface $container) {
        parent::__construct($container);
    }

    public function login(Request $request, Response $response): Response {
        $data = $request->getParsedBody();
        $data = is_array($data) ? $data : [];
        $username = trim((string) ($data['username'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if (($username === '') === ($email === '') || $password === '') {
            return $this->json($response, [
                'error' => 'Debe enviar username o email, y la contraseña.',
            ], 422);
        }

        $credentialsRequest = ['password' => $password];
        if ($username !== '') {
            $credentialsRequest['username'] = $username;
        } else {
            $credentialsRequest['email'] = $email;
        }

        try {
            $service = $this->container->get(DataService::class);
            $upstream = $service->post(
                '/auth/credentials',
                json_encode($credentialsRequest, JSON_THROW_ON_ERROR)
            );

            if ($upstream->getStatusCode() === 401) {
                return $this->json($response, ['error' => 'Credenciales inválidas.'], 401);
            }
            if ($upstream->getStatusCode() !== 200) {
                return $this->json($response, [
                    'error' => 'No se pudieron validar las credenciales.',
                ], 502);
            }

            $credentials = json_decode((string) $upstream->getBody(), true);
            if (!is_array($credentials)
                || !isset($credentials['id'], $credentials['email'], $credentials['rol_id'])) {
                return $this->json($response, [
                    'error' => 'El servicio de datos devolvió una respuesta inválida.',
                ], 502);
            }

            $tokens = $this->generateTokens($credentials);
            $this->saveRefreshToken((string) $credentials['id'], $tokens['tkRef']);

            return $this->json($response, $tokens, 200);
        } catch (ConnectException) {
            return $this->json($response, [
                'error' => 'El servicio de datos no está disponible.',
            ], 502);
        } catch (RequestException) {
            return $this->json($response, [
                'error' => 'No se pudo completar el inicio de sesión.',
            ], 502);
        }
    }

    public function loggout(Request $request, Response $response, array $args): Response {
        if ((string) RolMiddleware::usuarioDe($request) !== (string) ($args['id'] ?? '')) {
            return $this->json($response, ['error' => 'Solo puede cerrar su propia sesión.'], 403);
        }

        try {
            $this->saveRefreshToken((string) $args['id'], '');
            return $this->json($response, ['message' => 'Sesión cerrada correctamente.'], 200);
        } catch (ConnectException) {
            return $this->json($response, ['error' => 'El servicio de datos no está disponible.'], 502);
        } catch (RequestException) {
            return $this->json($response, ['error' => 'No se pudo cerrar la sesión.'], 502);
        }
    }

    public function refreshSession(Request $request, Response $response, array $args): Response {
        $body = $request->getParsedBody();
        $tkRef = is_array($body) ? ($body['tkRef'] ?? null) : null;

        if (!is_string($tkRef) || $tkRef === '') {
            return $this->json($response, ['error' => 'El token de refresco es obligatorio.'], 422);
        }

        try {
            $credenciales = $this->verifyRefreshToken((string) $args['id'], $tkRef);
            if ($credenciales === null) {
                return $this->json($response, ['error' => 'Token de refresco inválido.'], 401);
            }

            $tokens = $this->generateTokens($credenciales);
            $this->saveRefreshToken((string) $credenciales['id'], $tokens['tkRef']);

            return $this->json($response, $tokens, 200);
        } catch (ConnectException) {
            return $this->json($response, ['error' => 'El servicio de datos no está disponible.'], 502);
        } catch (RequestException) {
            return $this->json($response, ['error' => 'No se pudo refrescar la sesión.'], 502);
        }
    }

    private function json(Response $response, array $payload, int $status): Response {
        $response->getBody()->write(json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        ));

        return $response
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withStatus($status);
    }
}
