<?php

declare(strict_types=1);

namespace App\controllers;

use App\Services\DataService;
use Firebase\JWT\JWT;
use Psr\Container\ContainerInterface;

class Tokens {
    public function __construct(protected ContainerInterface $container) {}

    protected function generateTokens(array $credenciales): array {
        $config = $this->container->get('config');
        $now = time();

        $payload = [
            'iss' => 'gestion-hotel-business',
            'iat' => $now,
            'exp' => $now + $config->jwt_ttl,
            'sub' => (string) $credenciales['id'],
            'username' => $credenciales['username'] ?? null,
            'email' => $credenciales['email'] ?? null,
            'rol_id' => (int) $credenciales['rol_id'],
        ];

        $payloadRef = [
            'iss' => 'gestion-hotel-business',
            'iat' => $now,
            'sub' => (string) $credenciales['id'],
            'jti' => bin2hex(random_bytes(16)),
        ];

        return [
            'token' => JWT::encode($payload, $config->key, 'HS256'),
            'tkRef' => JWT::encode($payloadRef, $config->key, 'HS256'),
        ];
    }

    protected function saveRefreshToken(string $id, string $tkRef): void {
        $service = $this->container->get(DataService::class);
        $service->put('auth/tkref/' . rawurlencode($id), json_encode(['tkRef' => $tkRef], JSON_THROW_ON_ERROR));
    }

    protected function verifyRefreshToken(string $id, string $tkRef): ?array {
        $service = $this->container->get(DataService::class);
        $upstream = $service->post('auth/verify/' . rawurlencode($id), json_encode(['tkRef' => $tkRef], JSON_THROW_ON_ERROR));

        if ($upstream->getStatusCode() !== 200) {
            return null;
        }

        $data = json_decode((string) $upstream->getBody(), true);
        return is_array($data) && isset($data['id'], $data['rol_id']) ? $data : null;
    }
}
