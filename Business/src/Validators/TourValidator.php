<?php
declare(strict_types=1);

namespace App\Validators;

use Respect\Validation\ValidatorBuilder as v;
use Respect\Validation\Exceptions\ValidationException;

final class TourValidator {
    private function reglas(): array {
        return [
            'nombre' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(3,120)),
                'mensaje' => 'El nombre es obligatorio y debe tener entre 3 y 120 caracteres.',
            ],
            'descripcion' => [
                'regla' => v::stringType()
                ->length(v::between(1,1000)),
                'mensaje' => 'La descripción debe ser texto de máximo 1000 caracteres.',
            ],
            'duracion_minutos' => [
                'regla' => v::intVal()
                ->greaterThanOrEqual(1)
                ->lessThanOrEqual(1440),
                'mensaje' => 'La duración es obligatoria y debe ser un número entero de minutos entre 1 y 1440.',
            ],
            'precio_persona' => [
                'regla' => v::numericVal()
                ->greaterThan(0)
                ->lessThanOrEqual(99999999.99),
                'mensaje' => 'El precio por persona es obligatorio, debe ser numérico y mayor a 0.',
            ],
            'cupo_maximo' => [
                'regla' => v::intVal()
                ->greaterThanOrEqual(1)
                ->lessThanOrEqual(65535),
                'mensaje' => 'El cupo máximo es obligatorio y debe ser un número entero mayor a 0.',
            ],
            'punto_encuentro' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(3,200)),
                'mensaje' => 'El punto de encuentro es obligatorio y debe tener entre 3 y 200 caracteres.',
            ],
            'latitud' => [
                'regla' => v::numericVal()
                ->greaterThanOrEqual(-90)
                ->lessThanOrEqual(90),
                'mensaje' => 'La latitud debe ser numérica y estar entre -90 y 90.',
            ],
            'longitud' => [
                'regla' => v::numericVal()
                ->greaterThanOrEqual(-180)
                ->lessThanOrEqual(180),
                'mensaje' => 'La longitud debe ser numérica y estar entre -180 y 180.',
            ],
            'foto_url' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(10,255))
                ->regex('/^https?:\/\/\S+$/'),
                'mensaje' => 'La URL de la foto debe empezar con http:// o https:// y tener máximo 255 caracteres.',
            ],
            'activo' => [
                'regla' => v::intVal()
                ->greaterThanOrEqual(0)
                ->lessThanOrEqual(1),
                'mensaje' => 'El campo activo debe ser 0 o 1.',
            ],
        ];
    }

    public function validate(array $data, bool $parcial = false): array {
        $errores = [];

        foreach ($this->reglas() as $campo => $config){
            #En una actualización solo se validan los campos que se envían
            if($parcial && !array_key_exists($campo, $data)){
                continue;
            }
            $valor = $data[$campo] ?? null;
            $regla = $config['regla'];
            $mensaje = $config['mensaje'];
            if(($campo === 'descripcion' || $campo === 'latitud' || $campo === 'longitud' || $campo === 'foto_url' || $campo === 'activo') && ($valor === null || $valor === '')){
                continue;
            }
            if($regla->validate($valor)->hasFailed()){
                $errores[$campo] = $mensaje;
            }
        }
        return $errores;
    }
}
