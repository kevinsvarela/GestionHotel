<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Services\RolMiddleware;
use App\Validators\UsuarioValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class UsuarioValidatorTest extends TestCase
{
    private UsuarioValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new UsuarioValidator();
    }

    public function testAcceptsAValidStaffUser(): void
    {
        self::assertSame([], $this->validator->validate($this->validStaffUser()));
    }

    public function testStaffIdentificationIsOptional(): void
    {
        $user = $this->validStaffUser();
        unset($user['identificacion']);

        self::assertSame([], $this->validator->validate($user));
    }

    public function testStaffPasswordIsRequired(): void
    {
        $user = $this->validStaffUser();
        unset($user['password']);

        self::assertArrayHasKey('password', $this->validator->validate($user));
    }

    public function testAcceptsAClientWithoutUsernameOrPassword(): void
    {
        self::assertSame([], $this->validator->validate($this->validClient()));
    }

    public function testClientIdentificationIsRequired(): void
    {
        $client = $this->validClient();
        unset($client['identificacion']);

        self::assertArrayHasKey('identificacion', $this->validator->validate($client));
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $user = $this->validStaffUser();
        $user[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($user));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'non-positive role' => ['rol_id', 0],
            'name with digits' => ['nombre', 'Ana2'],
            'missing last names' => ['apellidos', ''],
            'identification with spaces' => ['identificacion', '1 2345 6789'],
            'email without domain' => ['email', 'recepcion@hotel'],
            'username with uppercase and underscore' => ['username', 'Recepcion_01'],
            'password without a symbol' => ['password', 'Clave123'],
            'phone starting with 1' => ['telefono', '1234-5678'],
            'invalid active flag' => ['activo', 2],
        ];
    }

    private function validStaffUser(): array
    {
        return [
            'rol_id' => RolMiddleware::RECEPCIONISTA,
            'nombre' => 'Fanny',
            'apellidos' => 'Chaves Bolívar',
            'identificacion' => '7-0123-0456',
            'email' => 'fchaves@hotel.com',
            'username' => 'recepcion03',
            'password' => 'Clave123#',
            'telefono' => '8888-1234',
            'activo' => 1,
        ];
    }

    private function validClient(): array
    {
        return [
            'rol_id' => RolMiddleware::CLIENTE,
            'nombre' => 'María',
            'apellidos' => 'Rodríguez Soto',
            'identificacion' => 'A12345678',
            'email' => 'maria.rodriguez@correo.com',
            'telefono' => '8765-4321',
        ];
    }
}
