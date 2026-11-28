<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\TourProgramadoValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TourProgramadoValidatorTest extends TestCase
{
    private TourProgramadoValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new TourProgramadoValidator();
    }

    public function testAcceptsAValidScheduledTour(): void
    {
        self::assertSame([], $this->validator->validate($this->validScheduledTour()));
    }

    public function testGuideAndStatusAreOptional(): void
    {
        $scheduledTour = $this->validScheduledTour();
        unset($scheduledTour['guia_id'], $scheduledTour['estado']);

        self::assertSame([], $this->validator->validate($scheduledTour));
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $scheduledTour = $this->validScheduledTour();
        $scheduledTour[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($scheduledTour));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'non-positive tour' => ['tour_id', 0],
            'non-positive guide' => ['guia_id', -1],
            'start without seconds' => ['fecha_hora_inicio', '2026-12-15 08:00'],
            'zero capacity' => ['cupo', 0],
            'unknown status' => ['estado', 'ACTIVO'],
        ];
    }

    private function validScheduledTour(): array
    {
        return [
            'tour_id' => 1,
            'guia_id' => 2,
            'fecha_hora_inicio' => '2026-12-15 08:00:00',
            'cupo' => 10,
            'estado' => 'PROGRAMADO',
        ];
    }
}
