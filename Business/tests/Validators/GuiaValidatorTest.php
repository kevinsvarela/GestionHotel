<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\GuiaValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class GuiaValidatorTest extends TestCase
{
    private GuiaValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new GuiaValidator();
    }

    public function testAcceptsAValidGuide(): void
    {
        self::assertSame([], $this->validator->validate($this->validGuide()));
    }

    public function testPhoneIsOptional(): void
    {
        $guide = $this->validGuide();
        unset($guide['telefono']);

        self::assertSame([], $this->validator->validate($guide));
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $guide = $this->validGuide();
        $guide[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($guide));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'name with digits' => ['nombre', 'Carlos 2'],
            'missing name' => ['nombre', ''],
            'phone starting with 9' => ['telefono', '9876-5432'],
            'phone without dash' => ['telefono', '87654321'],
            'invalid active flag' => ['activo', 5],
        ];
    }

    private function validGuide(): array
    {
        return [
            'nombre' => 'Carlos Mora',
            'telefono' => '8765-4321',
            'activo' => 1,
        ];
    }
}
