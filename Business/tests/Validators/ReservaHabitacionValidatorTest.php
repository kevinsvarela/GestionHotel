<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\ReservaHabitacionValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ReservaHabitacionValidatorTest extends TestCase
{
    private ReservaHabitacionValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new ReservaHabitacionValidator();
    }

    public function testAcceptsAValidReservation(): void
    {
        self::assertSame([], $this->validator->validate($this->validReservation()));
    }

    public function testAcceptsCheckInAndCheckOutDates(): void
    {
        $reservation = $this->validReservation();
        $reservation['estado'] = 'FINALIZADA';
        $reservation['checkin_at'] = '2026-12-20 14:00:00';
        $reservation['checkout_at'] = '2026-12-23 11:30:00';

        self::assertSame([], $this->validator->validate($reservation));
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $reservation = $this->validReservation();
        $reservation[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($reservation));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'tour reservation code' => ['codigo', 'RT-0001'],
            'code too short' => ['codigo', 'RH-12'],
            'non-positive client' => ['cliente_id', 0],
            'non-positive room' => ['habitacion_id', 0],
            'check-in date with slashes' => ['fecha_entrada', '20/12/2026'],
            'missing check-out date' => ['fecha_salida', ''],
            'zero guests' => ['huespedes', 0],
            'zero total' => ['total', 0],
            'unknown status' => ['estado', 'ABIERTA'],
            'check-in time without hour' => ['checkin_at', '2026-12-20'],
        ];
    }

    private function validReservation(): array
    {
        return [
            'codigo' => 'RH-0001',
            'cliente_id' => 7,
            'habitacion_id' => 3,
            'fecha_entrada' => '2026-12-20',
            'fecha_salida' => '2026-12-23',
            'huespedes' => 2,
        ];
    }
}
