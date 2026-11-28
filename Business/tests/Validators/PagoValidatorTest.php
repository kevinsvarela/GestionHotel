<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\PagoValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PagoValidatorTest extends TestCase
{
    private PagoValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new PagoValidator();
    }

    public function testAcceptsAValidPayment(): void
    {
        self::assertSame([], $this->validator->validate($this->validPayment()));
    }

    public function testCurrencyAndReferenceAreOptional(): void
    {
        $payment = $this->validPayment();
        unset($payment['moneda'], $payment['referencia']);

        self::assertSame([], $this->validator->validate($payment));
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $payment = $this->validPayment();
        $payment[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($payment));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'non-positive room reservation' => ['reserva_habitacion_id', 0],
            'missing registering user' => ['registrado_por', null],
            'zero amount' => ['monto', 0],
            'unsupported currency' => ['moneda', 'EUR'],
            'unsupported method' => ['metodo', 'CHEQUE'],
            'reference with spaces' => ['referencia', 'SP 123'],
            'payment date without time' => ['pagado_at', '2026-11-27'],
        ];
    }

    public function testAcceptsAValidCancellationReason(): void
    {
        self::assertSame([], $this->validator->validarAnulacion('Pago registrado dos veces'));
    }

    public function testRejectsAShortCancellationReason(): void
    {
        self::assertArrayHasKey('motivo', $this->validator->validarAnulacion('Mal'));
    }

    private function validPayment(): array
    {
        return [
            'reserva_habitacion_id' => 5,
            'registrado_por' => 1,
            'monto' => 25000,
            'moneda' => 'CRC',
            'metodo' => 'SINPE',
            'referencia' => 'SP-12345',
            'pagado_at' => '2026-11-27 10:30:00',
        ];
    }
}
