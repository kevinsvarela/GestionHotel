<?php
declare(strict_types=1);

namespace App\Validators;

use Respect\Validation\ValidatorBuilder as v;
use Respect\Validation\Exceptions\ValidationException;
use App\Services\RolMiddleware;

final class UsuarioValidator {
    private function reglas(): array {
        return [
            'rol_id' => [
                'regla' => v::intVal()
                ->greaterThanOrEqual(1)
                ->lessThanOrEqual(4294967295),
                'mensaje' => 'El rol es obligatorio y debe ser un id válido.',
            ],
            'nombre' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(2,80))
                ->regex('/^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{2,80}$/u'),
                'mensaje' => 'El nombre es obligatorio y debe tener entre 2 y 80 caracteres, solo letras y espacios.',
            ],
            'apellidos' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(2,120))
                ->regex('/^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{2,120}$/u'),
                'mensaje' => 'Los apellidos son obligatorios y deben tener entre 2 y 120 caracteres, solo letras y espacios.',
            ],
            'identificacion' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(5,20))
                ->regex('/^[A-Za-z0-9-]{5,20}$/'),
                'mensaje' => 'La cédula o pasaporte es obligatoria para los clientes y debe tener entre 5 y 20 letras, números o guiones.',
            ],
            'email' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(5,150))
                ->regex('/^[^\s@]+@[^\s@]+\.[^\s@]+$/'),
                'mensaje' => 'El email es obligatorio, debe tener un formato válido y máximo 150 caracteres.',
            ],
            'username' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(8,16))
                ->regex('/^[a-z0-9]{8,16}$/'),
                'mensaje' => 'El username debe tener entre 8 y 16 caracteres, usando solo minúsculas y números.',
            ],
            'password' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(8,64))
                ->regex('/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[#$@*])[\s\S]{8,64}$/'),
                'mensaje' => 'La contraseña debe tener entre 8 y 64 caracteres, incluir mayúscula, minúscula, número y un símbolo especial (#$@*).',
            ],
            'telefono' => [
                'regla' => v::stringType()
                ->regex('/^[2-8][0-9]{3}-[0-9]{4}$/')
                ->length(v::equals(9)),
                'mensaje' => 'El teléfono debe tener el formato ####-#### incluyendo el guión e iniciar con un dígito entre 2 y 8.',
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
            if(($campo === 'telefono' || $campo === 'activo' || $campo === 'username')
                && ($valor === null || $valor === '')){
                continue;
            }
            if($campo === 'identificacion' && ($valor === null || $valor === '')
                && (int) ($data['rol_id'] ?? 0) !== RolMiddleware::CLIENTE){
                continue;
            }
            if($campo === 'password' && ($valor === null || $valor === '')
                && (int) ($data['rol_id'] ?? 0) === RolMiddleware::CLIENTE){
                continue;
            }
            if($regla->validate($valor)->hasFailed()){
                $errores[$campo] = $mensaje;
            }
        }
        return $errores;
    }
}
