<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\HabitacionValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class HabitacionValidatorTest extends TestCase
{
    private HabitacionValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new HabitacionValidator();
    }

    public function testAcceptsAValidRoom(): void
    {
        self::assertSame([], $this->validator->validate($this->validRoom()));
    }

    public function testStatusIsOptional(): void
    {
        $room = $this->validRoom();
        unset($room['estado']);

        self::assertSame([], $this->validator->validate($room));
    }

    public function testPartialUpdateOnlyValidatesSentFields(): void
    {
        self::assertSame([], $this->validator->validate(['piso' => 3], true));

        $errors = $this->validator->validate(['piso' => 200], true);
        self::assertArrayHasKey('piso', $errors);
        self::assertArrayNotHasKey('numero', $errors);
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $room = $this->validRoom();
        $room[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($room));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'non-positive room type' => ['tipo_habitacion_id', 0],
            'lowercase room number' => ['numero', '101a'],
            'missing room number' => ['numero', ''],
            'floor out of range' => ['piso', 101],
            'unknown status' => ['estado', 'LIBRE'],
        ];
    }

    private function validRoom(): array
    {
        return [
            'tipo_habitacion_id' => 1,
            'numero' => '101',
            'piso' => 1,
            'estado' => 'DISPONIBLE',
        ];
    }
}
