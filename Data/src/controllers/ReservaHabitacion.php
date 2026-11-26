<?php
 
namespace App\controllers;
 
use App\Models\ReservaHabitacionModel;
use Illuminate\Database\QueryException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
 
class ReservaHabitacion {
    private ContainerInterface $container;
 
    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }
 
    public function read(Request $request, Response $response, array $args): Response {
        $this->container->get('eloquent');
        if(isset($args['id'])){
            $reserva = ReservaHabitacionModel::query()
                ->select(['id', 'codigo', 'cliente_id', 'habitacion_id', 'registrada_por', 'fecha_entrada', 'fecha_salida', 'huespedes', 'precio_noche', 'total', 'estado', 'checkin_at', 'checkout_at'])
                ->find($args['id']);
 
            if ($reserva === null) {
                return $this->json($response, ['error' => 'Reserva de habitación no encontrada.'], 404);
            }
 
            return $this->json($response, ['data' => $reserva], 200);
        }
 
        $reservas = ReservaHabitacionModel::query()
                ->select(['id', 'codigo', 'cliente_id', 'habitacion_id', 'registrada_por', 'fecha_entrada', 'fecha_salida', 'huespedes', 'precio_noche', 'total', 'estado', 'checkin_at', 'checkout_at'])
                ->get()
                ->toArray();
            return $this->json($response, ['data' => $reservas], 200);
    }
 
    public function create(Request $request, Response $response, array $args): Response {
        $data = $request->getParsedBody();
 
        $data = is_array($data) ? $data : [];
 
        $errors = [];
        $codigo = trim((string) ($data['codigo'] ?? ''));
        $clienteId = filter_var($data['cliente_id'] ?? '', FILTER_VALIDATE_INT);
        $habitacionId = filter_var($data['habitacion_id'] ?? '', FILTER_VALIDATE_INT);
        $registradaPor = isset($data['registrada_por']) ? filter_var($data['registrada_por'], FILTER_VALIDATE_INT) : null;
        $fechaEntrada = trim((string) ($data['fecha_entrada'] ?? ''));
        $fechaSalida = trim((string) ($data['fecha_salida'] ?? ''));
        $huespedes = filter_var($data['huespedes'] ?? '', FILTER_VALIDATE_INT);
        $precioNoche = $data['precio_noche'] ?? '';
        $total = $data['total'] ?? '';
        $estado = trim((string) ($data['estado'] ?? 'PENDIENTE'));
        $checkinAt = isset($data['checkin_at']) ? trim((string) $data['checkin_at']) : null;
        $checkoutAt = isset($data['checkout_at']) ? trim((string) $data['checkout_at']) : null;
 
        if ($codigo === '' || mb_strlen($codigo) > 20) {
            $errors['codigo'] = 'Es obligatorio y debe tener máximo 20 caracteres.';
        }
        if ($clienteId === false || $clienteId < 1) {
            $errors['cliente_id'] = 'Es obligatorio y debe ser un id válido.';
        }
        if ($habitacionId === false || $habitacionId < 1) {
            $errors['habitacion_id'] = 'Es obligatorio y debe ser un id válido.';
        }
        if ($registradaPor === false || ($registradaPor !== null && $registradaPor < 1)) {
            $errors['registrada_por'] = 'Debe ser un id válido.';
        }
        if ($fechaEntrada === '' || mb_strlen($fechaEntrada) > 10) {
            $errors['fecha_entrada'] = 'Es obligatorio.';
        }
        if ($fechaSalida === '' || mb_strlen($fechaSalida) > 10) {
            $errors['fecha_salida'] = 'Es obligatorio.';
        }
        if ($huespedes === false || $huespedes < 1) {
            $errors['huespedes'] = 'Es obligatorio y debe ser un número entero mayor o igual a 1.';
        }
        if (!is_numeric($precioNoche) || $precioNoche <= 0) {
            $errors['precio_noche'] = 'Es obligatorio, debe ser numérico y mayor a 0.';
        }
        if (!is_numeric($total) || $total <= 0) {
            $errors['total'] = 'Es obligatorio, debe ser numérico y mayor a 0.';
        }
        if ($estado === '' || mb_strlen($estado) > 20) {
            $errors['estado'] = 'Debe ser un valor válido.';
        }
        if ($checkinAt !== null && mb_strlen($checkinAt) > 19) {
            $errors['checkin_at'] = 'Debe tener máximo 19 caracteres.';
        }
        if ($checkinAt !== null && $checkinAt === '') {
            $checkinAt = null;
        }
        if ($checkoutAt !== null && mb_strlen($checkoutAt) > 19) {
            $errors['checkout_at'] = 'Debe tener máximo 19 caracteres.';
        }
        if ($checkoutAt !== null && $checkoutAt === '') {
            $checkoutAt = null;
        }
 
        if ($errors !== []) {
            return $this->json($response, ['errors' => $errors], 422);
        }
 
        try {
            $this->container->get('eloquent');
            $reserva = ReservaHabitacionModel::create([
                'codigo' => $codigo,
                'cliente_id' => $clienteId,
                'habitacion_id' => $habitacionId,
                'registrada_por' => $registradaPor,
                'fecha_entrada' => $fechaEntrada,
                'fecha_salida' => $fechaSalida,
                'huespedes' => $huespedes,
                'precio_noche' => $precioNoche,
                'total' => $total,
                'estado' => $estado,
                'checkin_at' => $checkinAt,
                'checkout_at' => $checkoutAt,
            ]);
        } catch (QueryException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) { #1062: el valor ya existe en una columna UNIQUE
                return $this->json($response, ['error' => 'El código de reserva ya está registrado.'], 409);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 1452) { #1452: la llave foránea apunta a un registro que no existe
                return $this->json($response, ['error' => 'Uno de los registros relacionados no existe.'], 422);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 3819) { #3819: no se cumple un CHECK de la tabla
                return $this->json($response, ['error' => 'La fecha de salida debe ser posterior a la de entrada, y los huéspedes y montos deben ser mayores a 0.'], 422);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 1265 || (int) ($exception->errorInfo[1] ?? 0) === 1292) { #1265 y 1292: estado o fecha con un valor no válido
                return $this->json($response, ['error' => 'Alguna fecha o estado tiene un valor no válido.'], 422);
            }
            throw $exception;
        }
 
        return $this->json($response, ['data' => $reserva->toArray()], 201);
    }
    public function filter(Request $request, Response $response, array $args): Response {
        $this->container->get('eloquent');

        $offset = filter_var($args['offset'] ?? 0, FILTER_VALIDATE_INT);
        $limit = filter_var($args['limit'] ?? 20, FILTER_VALIDATE_INT);

        if ($offset === false || $offset < 0 || $limit === false || $limit < 1 || $limit > 100) {
            return $this->json($response, [
                'error' => 'El offset debe ser mayor o igual a 0 y el límite debe estar entre 1 y 100.'],
                422);
        }

        $params = $request->getQueryParams();
        $codigo = trim((string) ($params['codigo'] ?? ''));
        $clienteId = filter_var($params['cliente_id'] ?? '', FILTER_VALIDATE_INT);
        $habitacionId = filter_var($params['habitacion_id'] ?? '', FILTER_VALIDATE_INT);
        $estado = trim((string) ($params['estado'] ?? ''));
        $fechaEntrada = trim((string) ($params['fecha_entrada'] ?? ''));
        $fechaSalida = trim((string) ($params['fecha_salida'] ?? ''));
        #Rango usado por la capa de negocio para buscar reservas que se cruzan con unas fechas
        $entradaAntesDe = trim((string) ($params['entrada_antes_de'] ?? ''));
        $salidaDespuesDe = trim((string) ($params['salida_despues_de'] ?? ''));

        $cliente = trim((string) ($params['cliente'] ?? ''));

        $query = ReservaHabitacionModel::query()
            ->select([
                'reservas_habitacion.id',
                'reservas_habitacion.codigo',
                'reservas_habitacion.cliente_id',
                'clientes.nombre as cliente_nombre',
                'clientes.apellidos as cliente_apellidos',
                'clientes.identificacion as cliente_identificacion',
                'reservas_habitacion.habitacion_id',
                'habitaciones.numero as habitacion_numero',
                'tipos_habitacion.nombre as tipo_habitacion_nombre',
                'reservas_habitacion.registrada_por',
                'reservas_habitacion.fecha_entrada',
                'reservas_habitacion.fecha_salida',
                'reservas_habitacion.huespedes',
                'reservas_habitacion.precio_noche',
                'reservas_habitacion.total',
                'reservas_habitacion.estado',
                'reservas_habitacion.checkin_at',
                'reservas_habitacion.checkout_at'
            ])
            ->selectRaw("COALESCE((SELECT SUM(ROUND(p.monto * p.tipo_cambio, 2)) FROM pagos p WHERE p.reserva_habitacion_id = reservas_habitacion.id AND p.estado = 'VIGENTE'), 0) AS pagado")
            ->leftJoin('usuarios as clientes', 'reservas_habitacion.cliente_id', '=', 'clientes.id')
            ->leftJoin('habitaciones', 'reservas_habitacion.habitacion_id', '=', 'habitaciones.id')
            ->leftJoin('tipos_habitacion', 'habitaciones.tipo_habitacion_id', '=', 'tipos_habitacion.id');

        if ($codigo !== '') {
            $query->where('reservas_habitacion.codigo', 'like', "%{$codigo}%");
        }
        if ($cliente !== '') {
            $query->where(function ($condicion) use ($cliente) {
                $condicion->whereRaw("CONCAT(clientes.nombre, ' ', clientes.apellidos) LIKE ?", ["%{$cliente}%"])
                    ->orWhere('clientes.identificacion', 'like', "%{$cliente}%");
            });
        }
        if ($clienteId !== false) {
            $query->where('reservas_habitacion.cliente_id', $clienteId);
        }
        if ($habitacionId !== false) {
            $query->where('reservas_habitacion.habitacion_id', $habitacionId);
        }
        if ($estado !== '') {
            $query->where('reservas_habitacion.estado', $estado);
        }
        if ($fechaEntrada !== '') {
            $query->whereDate('reservas_habitacion.fecha_entrada', $fechaEntrada);
        }
        if ($fechaSalida !== '') {
            $query->whereDate('reservas_habitacion.fecha_salida', $fechaSalida);
        }
        if ($entradaAntesDe !== '') {
            $query->where('reservas_habitacion.fecha_entrada', '<', $entradaAntesDe);
        }
        if ($salidaDespuesDe !== '') {
            $query->where('reservas_habitacion.fecha_salida', '>', $salidaDespuesDe);
        }

        $total = (clone $query)->count('reservas_habitacion.id');

        $reservas = $query
            ->orderBy('reservas_habitacion.fecha_entrada', 'desc')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();

        return $this->json($response, [
            'data' => $reservas,
            'pagination' => [
                'offset' => $offset,
                'limit' => $limit,
                'total' => $total
            ]
        ], 200);
    }
 
    public function update(Request $request, Response $response, array $args): Response {
        $eloquent = $this->container->get('eloquent');
        if (isset($args['id'])) {
            $reserva = ReservaHabitacionModel::find($args['id']);
 
            if ($reserva === null) {
                return $this->json($response, ['error' => 'Reserva de habitación no encontrada.'], 404);
            }
 
            $data = $request->getParsedBody();
            $data = is_array($data) ? $data : [];
 
            if (isset($data['codigo'])) {
                $codigo = trim((string) $data['codigo']);
                if ($codigo === '' || mb_strlen($codigo) > 20) {
                    return $this->json($response, ['error' => 'Código inválido.'], 422);
                }
                $reserva->codigo = $codigo;
            }

            if (isset($data['cliente_id'])) {
                $clienteId = filter_var($data['cliente_id'], FILTER_VALIDATE_INT);
                if ($clienteId === false || $clienteId < 1) {
                    return $this->json($response, ['error' => 'Cliente inválido.'], 422);
                }
                $reserva->cliente_id = $clienteId;
            }

            if (isset($data['habitacion_id'])) {
                $habitacionId = filter_var($data['habitacion_id'], FILTER_VALIDATE_INT);
                if ($habitacionId === false || $habitacionId < 1) {
                    return $this->json($response, ['error' => 'Habitación inválida.'], 422);
                }
                $reserva->habitacion_id = $habitacionId;
            }

            if (isset($data['registrada_por'])) {
                $registradaPor = filter_var($data['registrada_por'], FILTER_VALIDATE_INT);
                if ($registradaPor === false || $registradaPor < 1) {
                    return $this->json($response, ['error' => 'Usuario que registra inválido.'], 422);
                }
                $reserva->registrada_por = $registradaPor;
            }

            if (isset($data['fecha_entrada'])) {
                $fechaEntrada = trim((string) $data['fecha_entrada']);
                if ($fechaEntrada === '' || mb_strlen($fechaEntrada) > 10) {
                    return $this->json($response, ['error' => 'Fecha de entrada inválida.'], 422);
                }
                $reserva->fecha_entrada = $fechaEntrada;
            }

            if (isset($data['fecha_salida'])) {
                $fechaSalida = trim((string) $data['fecha_salida']);
                if ($fechaSalida === '' || mb_strlen($fechaSalida) > 10) {
                    return $this->json($response, ['error' => 'Fecha de salida inválida.'], 422);
                }
                $reserva->fecha_salida = $fechaSalida;
            }

            if (isset($data['huespedes'])) {
                $huespedes = filter_var($data['huespedes'], FILTER_VALIDATE_INT);
                if ($huespedes === false || $huespedes < 1) {
                    return $this->json($response, ['error' => 'Cantidad de huéspedes inválida.'], 422);
                }
                $reserva->huespedes = $huespedes;
            }

            if (isset($data['precio_noche'])) {
                $precioNoche = $data['precio_noche'];
                if (!is_numeric($precioNoche) || $precioNoche <= 0) {
                    return $this->json($response, ['error' => 'Precio por noche inválido.'], 422);
                }
                $reserva->precio_noche = $precioNoche;
            }

            if (isset($data['total'])) {
                $total = $data['total'];
                if (!is_numeric($total) || $total <= 0) {
                    return $this->json($response, ['error' => 'Total inválido.'], 422);
                }
                $reserva->total = $total;
            }

            if (isset($data['estado'])) {
                $estado = trim((string) $data['estado']);
                if ($estado === '' || mb_strlen($estado) > 20) {
                    return $this->json($response, ['error' => 'Estado inválido.'], 422);
                }
                $reserva->estado = $estado;
            }

            if (isset($data['checkin_at'])) {
                $checkinAt = trim((string) $data['checkin_at']);
                if (mb_strlen($checkinAt) > 19) {
                    return $this->json($response, ['error' => 'Fecha de check-in inválida.'], 422);
                }
                $reserva->checkin_at = $checkinAt === '' ? null : $checkinAt;
            }

            if (isset($data['checkout_at'])) {
                $checkoutAt = trim((string) $data['checkout_at']);
                if (mb_strlen($checkoutAt) > 19) {
                    return $this->json($response, ['error' => 'Fecha de check-out inválida.'], 422);
                }
                $reserva->checkout_at = $checkoutAt === '' ? null : $checkoutAt;
            }

            try {
                $reserva->save();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1062) { #1062: el valor ya existe en una columna UNIQUE
                    return $this->json($response, ['error' => 'El código de reserva ya está registrado.'], 409);
                }
                if ((int) ($exception->errorInfo[1] ?? 0) === 1452) { #1452: la llave foránea apunta a un registro que no existe
                    return $this->json($response, ['error' => 'Uno de los registros relacionados no existe.'], 422);
                }
                if ((int) ($exception->errorInfo[1] ?? 0) === 3819) { #3819: no se cumple un CHECK de la tabla
                    return $this->json($response, ['error' => 'La fecha de salida debe ser posterior a la de entrada, y los huéspedes y montos deben ser mayores a 0.'], 422);
                }
                if ((int) ($exception->errorInfo[1] ?? 0) === 1265 || (int) ($exception->errorInfo[1] ?? 0) === 1292) { #1265 y 1292: estado o fecha con un valor no válido
                    return $this->json($response, ['error' => 'Alguna fecha o estado tiene un valor no válido.'], 422);
                }
                throw $exception;
            }
 
            return $this->json($response, ['data' => $reserva->toArray()], 200);
        }
    }
 
    public function delete(Request $request, Response $response, array $args): Response {
        $eloquent = $this->container->get('eloquent');
        if (isset($args['id'])) {
            $reserva = ReservaHabitacionModel::find($args['id']);
 
            if ($reserva === null) {
                return $this->json($response, ['error' => 'Reserva de habitación no encontrada.'], 404);
            }
 
            try {
                $reserva->delete();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1451) { #1451: otros registros dependen de este
                    return $this->json($response, ['error' => 'No se puede eliminar porque tiene registros asociados.'], 409);
                }
 
                throw $exception;
            }
 
            return $this->json($response, ['message' => 'Reserva de habitación eliminada correctamente.'], 200);
        }
    }
 
    private function json(Response $response, array $payload, int $status): Response{
    $response->getBody()->write(json_encode($payload,
        JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
 
        return $response
            ->withHeader('Content-Type', 'application/json; charset=UTF-8')
            ->withStatus($status);
    }
 
}
