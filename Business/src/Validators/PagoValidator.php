<?php
declare(strict_types=1);

namespace App\Validators;

use Respect\Validation\ValidatorBuilder as v;
use Respect\Validation\Exceptions\ValidationException;
use App\Services\DataService;

final class PagoValidator {
    private function reglas(): array {
        return [
            'reserva_habitacion_id' => [
                'regla' => v::intVal()
                ->greaterThanOrEqual(1)
                ->lessThanOrEqual(4294967295),
                'mensaje' => 'La reserva de habitación debe ser un id válido.',
            ],
            'reserva_tour_id' => [
                'regla' => v::intVal()
                ->greaterThanOrEqual(1)
                ->lessThanOrEqual(4294967295),
                'mensaje' => 'La reserva de tour debe ser un id válido.',
            ],
            'registrado_por' => [
                'regla' => v::intVal()
                ->greaterThanOrEqual(1)
                ->lessThanOrEqual(4294967295),
                'mensaje' => 'El usuario que registra es obligatorio y debe ser un id válido.',
            ],
            'monto' => [
                'regla' => v::numericVal()
                ->greaterThan(0)
                ->lessThanOrEqual(99999999.99),
                'mensaje' => 'El monto es obligatorio, debe ser numérico y mayor a 0.',
            ],
            'moneda' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::equals(3))
                ->regex('/^(CRC|USD)$/'),
                'mensaje' => 'La moneda debe ser CRC o USD.',
            ],
            'metodo' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(5,8))
                ->regex('/^(EFECTIVO|TARJETA|SINPE)$/'),
                'mensaje' => 'El método de pago es obligatorio y debe ser EFECTIVO, TARJETA o SINPE.',
            ],
            'referencia' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::between(3,50))
                ->regex('/^[A-Za-z0-9-]{3,50}$/'),
                'mensaje' => 'La referencia debe tener entre 3 y 50 caracteres, solo letras, números y guiones.',
            ],
            'pagado_at' => [
                'regla' => v::stringType()
                ->notBlank()
                ->length(v::equals(19))
                ->regex('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/'),
                'mensaje' => 'La fecha de pago es obligatoria y debe tener el formato AAAA-MM-DD HH:MM:SS.',
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
            if(($campo === 'reserva_habitacion_id' || $campo === 'reserva_tour_id' || $campo === 'moneda' || $campo === 'referencia') && ($valor === null || $valor === '')){
                continue;
            }
            if($regla->validate($valor)->hasFailed()){
                $errores[$campo] = $mensaje;
            }
        }
        return $errores;
    }

    public function validarAnulacion(string $motivo): array {
        $regla = v::stringType()->length(v::between(5, 200));
        return $regla->validate($motivo)->hasFailed()
            ? ['motivo' => 'El motivo es obligatorio y debe tener entre 5 y 200 caracteres.']
            : [];
    }

    #----- Reglas de negocio: se revisan contra la capa de datos después de validar el formato -----
    #$pago: datos completos del pago (en una actualización, lo que había más los cambios)
    public function aplicarReglas(DataService $dataservice, array $pago): array {
        $reservaHabitacion = $pago['reserva_habitacion_id'] ?? null;
        $reservaTour = $pago['reserva_tour_id'] ?? null;
        $tieneHabitacion = $reservaHabitacion !== null && $reservaHabitacion !== '';
        $tieneTour = $reservaTour !== null && $reservaTour !== '';

        #1. El pago es de una sola reserva: de habitación o de tour
        if ($tieneHabitacion === $tieneTour) {
            throw new ReglaNegocioException('El pago debe asociarse a una reserva de habitación o a una reserva de tour, pero no a ambas.', 400);
        }

        #2. La reserva existe y no está cancelada
        $path = $tieneHabitacion
            ? 'reservas-habitacion/' . rawurlencode((string) $reservaHabitacion)
            : 'reservas-tour/' . rawurlencode((string) $reservaTour);
        $reserva = $dataservice->obtener($path);
        if ($reserva === null) {
            throw new ReglaNegocioException('La reserva indicada no existe.', 422);
        }
        if ($reserva['data']['estado'] === 'CANCELADA') {
            throw new ReglaNegocioException('No se puede registrar un pago para una reserva cancelada.', 409);
        }

        return $pago;
    }
}
