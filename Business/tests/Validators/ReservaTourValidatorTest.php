<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\ReservaTourValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ReservaTourValidatorTest extends TestCase
{
    private ReservaTourValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new ReservaTourValidator();
    }

    public function testAcceptsAValidReservation(): void
    {
        self::assertSame([], $this->validator->validate($this->validReservation()));
    }

    public function testAcceptsPriceAndTotalWhenSent(): void
    {
        $reservation = $this->validReservation();
        $reservation['precio_persona'] = 25000;
        $reservation['total'] = 50000;
        $reservation['estado'] = 'CONFIRMADA';

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
            'room reservation code' => ['codigo', 'RH-0001'],
            'non-positive scheduled tour' => ['tour_programado_id', 0],
            'non-positive client' => ['cliente_id', 0],
            'zero people' => ['personas', 0],
            'zero price' => ['precio_persona', 0],
            'status not allowed for tours' => ['estado', 'EN_CURSO'],
        ];
    }

    private function validReservation(): array
    {
        return [
            'codigo' => 'RT-0001',
            'tour_programado_id' => 4,
            'cliente_id' => 7,
            'personas' => 2,
        ];
    }
}
