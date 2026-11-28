<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\TipoHabitacionValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TipoHabitacionValidatorTest extends TestCase
{
    private TipoHabitacionValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new TipoHabitacionValidator();
    }

    public function testAcceptsAValidRoomType(): void
    {
        self::assertSame([], $this->validator->validate($this->validRoomType()));
    }

    public function testDescriptionAndActiveAreOptional(): void
    {
        $roomType = $this->validRoomType();
        unset($roomType['descripcion'], $roomType['activo']);

        self::assertSame([], $this->validator->validate($roomType));
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $roomType = $this->validRoomType();
        $roomType[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($roomType));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'name with digits' => ['nombre', 'Suite 2'],
            'name too short' => ['nombre', 'Su'],
            'description too long' => ['descripcion', str_repeat('a', 1001)],
            'zero capacity' => ['capacidad', 0],
            'capacity out of range' => ['capacidad', 256],
            'zero price' => ['precio_noche', 0],
            'non-numeric price' => ['precio_noche', 'gratis'],
            'invalid active flag' => ['activo', 2],
        ];
    }

    private function validRoomType(): array
    {
        return [
            'nombre' => 'Suite Familiar',
            'descripcion' => 'Dos camas matrimoniales y vista al mar.',
            'capacidad' => 4,
            'precio_noche' => 85000,
            'activo' => 1,
        ];
    }
}
