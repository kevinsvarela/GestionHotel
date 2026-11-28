<?php
declare(strict_types=1);

namespace App\Tests\Validators;

use App\Validators\TourValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TourValidatorTest extends TestCase
{
    private TourValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new TourValidator();
    }

    public function testAcceptsAValidTour(): void
    {
        self::assertSame([], $this->validator->validate($this->validTour()));
    }

    public function testOptionalFieldsCanBeOmitted(): void
    {
        $tour = $this->validTour();
        unset($tour['descripcion'], $tour['latitud'], $tour['longitud'], $tour['foto_url'], $tour['activo']);

        self::assertSame([], $this->validator->validate($tour));
    }

    #[DataProvider('invalidFieldProvider')]
    public function testRejectsInvalidFields(string $field, mixed $value): void
    {
        $tour = $this->validTour();
        $tour[$field] = $value;

        self::assertArrayHasKey($field, $this->validator->validate($tour));
    }

    public static function invalidFieldProvider(): array
    {
        return [
            'name too short' => ['nombre', 'Ab'],
            'zero duration' => ['duracion_minutos', 0],
            'duration over a day' => ['duracion_minutos', 1441],
            'zero price' => ['precio_persona', 0],
            'zero capacity' => ['cupo_maximo', 0],
            'meeting point too short' => ['punto_encuentro', 'ab'],
            'latitude out of range' => ['latitud', 95],
            'longitude out of range' => ['longitud', -200],
            'photo url without http' => ['foto_url', 'fotos/cahuita.jpg'],
            'invalid active flag' => ['activo', 2],
        ];
    }

    private function validTour(): array
    {
        return [
            'nombre' => 'Tour al Parque Nacional Cahuita',
            'descripcion' => 'Caminata guiada por el sendero principal.',
            'duracion_minutos' => 180,
            'precio_persona' => 25000,
            'cupo_maximo' => 15,
            'punto_encuentro' => 'Recepción del hotel',
            'latitud' => 9.7376,
            'longitud' => -82.8406,
            'foto_url' => 'https://hotel.com/fotos/cahuita.jpg',
            'activo' => 1,
        ];
    }
}
