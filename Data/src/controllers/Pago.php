<?php
 
namespace App\controllers;
 
use App\Models\PagoModel;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\QueryException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
 
class Pago {
    private ContainerInterface $container;
 
    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }
 
    public function read(Request $request, Response $response, array $args): Response {
        $this->container->get('eloquent');
        if(isset($args['id'])){
            $pago = PagoModel::query()
                ->select(['id', 'reserva_habitacion_id', 'reserva_tour_id', 'registrado_por', 'monto', 'moneda', 'metodo', 'referencia', 'pagado_at'])
                ->find($args['id']);
 
            if ($pago === null) {
                return $this->json($response, ['error' => 'Pago no encontrado.'], 404);
            }
 
            return $this->json($response, ['data' => $pago], 200);
        }
 
        $pagos = PagoModel::query()
                ->select(['id', 'reserva_habitacion_id', 'reserva_tour_id', 'registrado_por', 'monto', 'moneda', 'metodo', 'referencia', 'pagado_at'])
                ->get()
                ->toArray();
            return $this->json($response, ['data' => $pagos], 200);
    }
 
    public function create(Request $request, Response $response, array $args): Response {
        $data = $request->getParsedBody();
 
        $data = is_array($data) ? $data : [];
 
        $errors = [];
        $reservaHabitacionId = isset($data['reserva_habitacion_id']) ? filter_var($data['reserva_habitacion_id'], FILTER_VALIDATE_INT) : null;
        $reservaTourId = isset($data['reserva_tour_id']) ? filter_var($data['reserva_tour_id'], FILTER_VALIDATE_INT) : null;
        $registradoPor = filter_var($data['registrado_por'] ?? '', FILTER_VALIDATE_INT);
        $monto = $data['monto'] ?? '';
        $moneda = trim((string) ($data['moneda'] ?? 'CRC'));
        $metodo = trim((string) ($data['metodo'] ?? ''));
        $referencia = isset($data['referencia']) ? trim((string) $data['referencia']) : null;
        $pagadoAt = trim((string) ($data['pagado_at'] ?? ''));
 
        if ($reservaHabitacionId === false || ($reservaHabitacionId !== null && $reservaHabitacionId < 1)) {
            $errors['reserva_habitacion_id'] = 'Debe ser un id válido.';
        }
        if ($reservaTourId === false || ($reservaTourId !== null && $reservaTourId < 1)) {
            $errors['reserva_tour_id'] = 'Debe ser un id válido.';
        }
        if ($registradoPor === false || $registradoPor < 1) {
            $errors['registrado_por'] = 'Es obligatorio y debe ser un id válido.';
        }
        if (!is_numeric($monto) || $monto <= 0) {
            $errors['monto'] = 'Es obligatorio, debe ser numérico y mayor a 0.';
        }
        if ($moneda === '' || mb_strlen($moneda) > 3) {
            $errors['moneda'] = 'Debe ser un valor válido.';
        }
        if ($metodo === '' || mb_strlen($metodo) > 20) {
            $errors['metodo'] = 'Es obligatorio.';
        }
        if ($referencia !== null && mb_strlen($referencia) > 50) {
            $errors['referencia'] = 'Debe tener máximo 50 caracteres.';
        }
        if ($referencia !== null && $referencia === '') {
            $referencia = null;
        }
        if ($pagadoAt === '' || mb_strlen($pagadoAt) > 19) {
            $errors['pagado_at'] = 'Es obligatorio.';
        }
 
        if ($errors !== []) {
            return $this->json($response, ['errors' => $errors], 422);
        }
 
        try {
            $this->container->get('eloquent');
            $pago = PagoModel::create([
                'reserva_habitacion_id' => $reservaHabitacionId,
                'reserva_tour_id' => $reservaTourId,
                'registrado_por' => $registradoPor,
                'monto' => $monto,
                'moneda' => $moneda,
                'metodo' => $metodo,
                'referencia' => $referencia,
                'pagado_at' => $pagadoAt,
            ]);
        } catch (QueryException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) { #1062: el valor ya existe en una columna UNIQUE
                return $this->json($response, ['error' => 'Ya existe un pago con ese método y referencia.'], 409);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 1452) { #1452: la llave foránea apunta a un registro que no existe
                return $this->json($response, ['error' => 'Uno de los registros relacionados no existe.'], 422);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 3819) { #3819: no se cumple un CHECK de la tabla
                return $this->json($response, ['error' => 'El pago debe ser de una sola reserva (de habitación o de tour), con monto mayor a 0 y moneda CRC o USD.'], 422);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 1265 || (int) ($exception->errorInfo[1] ?? 0) === 1292) { #1265 y 1292: estado o fecha con un valor no válido
                return $this->json($response, ['error' => 'Alguna fecha o estado tiene un valor no válido.'], 422);
            }
            throw $exception;
        }
 
        return $this->json($response, ['data' => $pago->toArray()], 201);
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
        $reservaHabitacionId = filter_var($params['reserva_habitacion_id'] ?? '', FILTER_VALIDATE_INT);
        $reservaTourId = filter_var($params['reserva_tour_id'] ?? '', FILTER_VALIDATE_INT);
        $registradoPor = filter_var($params['registrado_por'] ?? '', FILTER_VALIDATE_INT);
        $moneda = trim((string) ($params['moneda'] ?? ''));
        $metodo = trim((string) ($params['metodo'] ?? ''));
        $referencia = trim((string) ($params['referencia'] ?? ''));
        $fecha = trim((string) ($params['fecha'] ?? ''));

        $codigo = trim((string) ($params['codigo'] ?? ''));
        $cliente = trim((string) ($params['cliente'] ?? ''));

        $query = PagoModel::query()
            ->select([
                'pagos.id',
                'pagos.reserva_habitacion_id',
                'pagos.reserva_tour_id',
                'pagos.registrado_por',
                'pagos.monto',
                'pagos.moneda',
                'pagos.metodo',
                'pagos.referencia',
                'pagos.pagado_at',
                'registradores.nombre as registrado_por_nombre',
            ])
            ->selectRaw('COALESCE(rh.codigo, rt.codigo) AS codigo_reserva')
            ->selectRaw('clientes.nombre AS cliente_nombre')
            ->selectRaw('clientes.apellidos AS cliente_apellidos')
            ->leftJoin('reservas_habitacion as rh', 'pagos.reserva_habitacion_id', '=', 'rh.id')
            ->leftJoin('reservas_tour as rt', 'pagos.reserva_tour_id', '=', 'rt.id')
            ->leftJoin('usuarios as clientes', 'clientes.id', '=', Capsule::raw('COALESCE(rh.cliente_id, rt.cliente_id)'))
            ->leftJoin('usuarios as registradores', 'pagos.registrado_por', '=', 'registradores.id');

        if ($reservaHabitacionId !== false) {
            $query->where('pagos.reserva_habitacion_id', $reservaHabitacionId);
        }
        if ($reservaTourId !== false) {
            $query->where('pagos.reserva_tour_id', $reservaTourId);
        }
        if ($registradoPor !== false) {
            $query->where('pagos.registrado_por', $registradoPor);
        }
        if ($moneda !== '') {
            $query->where('pagos.moneda', $moneda);
        }
        if ($metodo !== '') {
            $query->where('pagos.metodo', $metodo);
        }
        if ($referencia !== '') {
            $query->where('pagos.referencia', 'like', "%{$referencia}%");
        }
        if ($fecha !== '') {
            $query->whereDate('pagos.pagado_at', $fecha);
        }
        if ($codigo !== '') {
            $query->where(function ($condicion) use ($codigo) {
                $condicion->where('rh.codigo', 'like', "%{$codigo}%")
                    ->orWhere('rt.codigo', 'like', "%{$codigo}%");
            });
        }
        if ($cliente !== '') {
            $query->where(function ($condicion) use ($cliente) {
                $condicion->whereRaw("CONCAT(clientes.nombre, ' ', clientes.apellidos) LIKE ?", ["%{$cliente}%"])
                    ->orWhere('clientes.identificacion', 'like', "%{$cliente}%");
            });
        }

        $total = (clone $query)->count('pagos.id');

        $pagos = $query
            ->orderBy('pagos.pagado_at', 'desc')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();

        return $this->json($response, [
            'data' => $pagos,
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
            $pago = PagoModel::find($args['id']);
 
            if ($pago === null) {
                return $this->json($response, ['error' => 'Pago no encontrado.'], 404);
            }
 
            $data = $request->getParsedBody();
            $data = is_array($data) ? $data : [];
 
            if (isset($data['reserva_habitacion_id'])) {
                $reservaHabitacionId = filter_var($data['reserva_habitacion_id'], FILTER_VALIDATE_INT);
                if ($reservaHabitacionId === false || $reservaHabitacionId < 1) {
                    return $this->json($response, ['error' => 'Reserva de habitación inválida.'], 422);
                }
                $pago->reserva_habitacion_id = $reservaHabitacionId;
            }

            if (isset($data['reserva_tour_id'])) {
                $reservaTourId = filter_var($data['reserva_tour_id'], FILTER_VALIDATE_INT);
                if ($reservaTourId === false || $reservaTourId < 1) {
                    return $this->json($response, ['error' => 'Reserva de tour inválida.'], 422);
                }
                $pago->reserva_tour_id = $reservaTourId;
            }

            if (isset($data['registrado_por'])) {
                $registradoPor = filter_var($data['registrado_por'], FILTER_VALIDATE_INT);
                if ($registradoPor === false || $registradoPor < 1) {
                    return $this->json($response, ['error' => 'Usuario que registra inválido.'], 422);
                }
                $pago->registrado_por = $registradoPor;
            }

            if (isset($data['monto'])) {
                $monto = $data['monto'];
                if (!is_numeric($monto) || $monto <= 0) {
                    return $this->json($response, ['error' => 'Monto inválido.'], 422);
                }
                $pago->monto = $monto;
            }

            if (isset($data['moneda'])) {
                $moneda = trim((string) $data['moneda']);
                if ($moneda === '' || mb_strlen($moneda) > 3) {
                    return $this->json($response, ['error' => 'Moneda inválida.'], 422);
                }
                $pago->moneda = $moneda;
            }

            if (isset($data['metodo'])) {
                $metodo = trim((string) $data['metodo']);
                if ($metodo === '' || mb_strlen($metodo) > 20) {
                    return $this->json($response, ['error' => 'Método de pago inválido.'], 422);
                }
                $pago->metodo = $metodo;
            }

            if (isset($data['referencia'])) {
                $referencia = trim((string) $data['referencia']);
                if (mb_strlen($referencia) > 50) {
                    return $this->json($response, ['error' => 'Referencia inválida.'], 422);
                }
                $pago->referencia = $referencia === '' ? null : $referencia;
            }

            if (isset($data['pagado_at'])) {
                $pagadoAt = trim((string) $data['pagado_at']);
                if ($pagadoAt === '' || mb_strlen($pagadoAt) > 19) {
                    return $this->json($response, ['error' => 'Fecha de pago inválida.'], 422);
                }
                $pago->pagado_at = $pagadoAt;
            }

            try {
                $pago->save();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1062) { #1062: el valor ya existe en una columna UNIQUE
                    return $this->json($response, ['error' => 'Ya existe un pago con ese método y referencia.'], 409);
                }
                if ((int) ($exception->errorInfo[1] ?? 0) === 1452) { #1452: la llave foránea apunta a un registro que no existe
                    return $this->json($response, ['error' => 'Uno de los registros relacionados no existe.'], 422);
                }
                if ((int) ($exception->errorInfo[1] ?? 0) === 3819) { #3819: no se cumple un CHECK de la tabla
                    return $this->json($response, ['error' => 'El pago debe ser de una sola reserva (de habitación o de tour), con monto mayor a 0 y moneda CRC o USD.'], 422);
                }
                if ((int) ($exception->errorInfo[1] ?? 0) === 1265 || (int) ($exception->errorInfo[1] ?? 0) === 1292) { #1265 y 1292: estado o fecha con un valor no válido
                    return $this->json($response, ['error' => 'Alguna fecha o estado tiene un valor no válido.'], 422);
                }
                throw $exception;
            }
 
            return $this->json($response, ['data' => $pago->toArray()], 200);
        }
    }
 
    public function delete(Request $request, Response $response, array $args): Response {
        $eloquent = $this->container->get('eloquent');
        if (isset($args['id'])) {
            $pago = PagoModel::find($args['id']);
 
            if ($pago === null) {
                return $this->json($response, ['error' => 'Pago no encontrado.'], 404);
            }
 
            try {
                $pago->delete();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1451) { #1451: otros registros dependen de este
                    return $this->json($response, ['error' => 'No se puede eliminar porque tiene registros asociados.'], 409);
                }
 
                throw $exception;
            }
 
            return $this->json($response, ['message' => 'Pago eliminado correctamente.'], 200);
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
