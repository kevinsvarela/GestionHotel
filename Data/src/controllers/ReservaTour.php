<?php
 
namespace App\controllers;
 
use App\Models\ReservaTourModel;
use Illuminate\Database\QueryException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
 
class ReservaTour {
    private ContainerInterface $container;
 
    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }
 
    public function read(Request $request, Response $response, array $args): Response {
        $this->container->get('eloquent');
        TourProgramado::actualizarEstados();
        if(isset($args['id'])){
            $reserva = ReservaTourModel::query()
                ->select(['id', 'codigo', 'tour_programado_id', 'cliente_id', 'personas', 'precio_persona', 'total', 'estado'])
                ->find($args['id']);
 
            if ($reserva === null) {
                return $this->json($response, ['error' => 'Reserva de tour no encontrada.'], 404);
            }
 
            return $this->json($response, ['data' => $reserva], 200);
        }
 
        $reservas = ReservaTourModel::query()
                ->select(['id', 'codigo', 'tour_programado_id', 'cliente_id', 'personas', 'precio_persona', 'total', 'estado'])
                ->get()
                ->toArray();
            return $this->json($response, ['data' => $reservas], 200);
    }
 
    public function create(Request $request, Response $response, array $args): Response {
        $data = $request->getParsedBody();
 
        $data = is_array($data) ? $data : [];
 
        $errors = [];
        $codigo = trim((string) ($data['codigo'] ?? ''));
        $tourProgramadoId = filter_var($data['tour_programado_id'] ?? '', FILTER_VALIDATE_INT);
        $clienteId = filter_var($data['cliente_id'] ?? '', FILTER_VALIDATE_INT);
        $personas = filter_var($data['personas'] ?? '', FILTER_VALIDATE_INT);
        $precioPersona = $data['precio_persona'] ?? '';
        $total = $data['total'] ?? '';
        $estado = trim((string) ($data['estado'] ?? 'PENDIENTE'));
 
        if ($codigo === '' || mb_strlen($codigo) > 20) {
            $errors['codigo'] = 'Es obligatorio y debe tener máximo 20 caracteres.';
        }
        if ($tourProgramadoId === false || $tourProgramadoId < 1) {
            $errors['tour_programado_id'] = 'Es obligatorio y debe ser un id válido.';
        }
        if ($clienteId === false || $clienteId < 1) {
            $errors['cliente_id'] = 'Es obligatorio y debe ser un id válido.';
        }
        if ($personas === false || $personas < 1) {
            $errors['personas'] = 'Es obligatorio y debe ser un número entero mayor o igual a 1.';
        }
        if (!is_numeric($precioPersona) || $precioPersona <= 0) {
            $errors['precio_persona'] = 'Es obligatorio, debe ser numérico y mayor a 0.';
        }
        if (!is_numeric($total) || $total <= 0) {
            $errors['total'] = 'Es obligatorio, debe ser numérico y mayor a 0.';
        }
        if ($estado === '' || mb_strlen($estado) > 20) {
            $errors['estado'] = 'Debe ser un valor válido.';
        }
 
        if ($errors !== []) {
            return $this->json($response, ['errors' => $errors], 422);
        }
 
        try {
            $this->container->get('eloquent');
            $reserva = ReservaTourModel::create([
                'codigo' => $codigo,
                'tour_programado_id' => $tourProgramadoId,
                'cliente_id' => $clienteId,
                'personas' => $personas,
                'precio_persona' => $precioPersona,
                'total' => $total,
                'estado' => $estado,
            ]);
        } catch (QueryException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) { #1062: el valor ya existe en una columna UNIQUE
                return $this->json($response, ['error' => 'El código de reserva ya está registrado.'], 409);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 1452) { #1452: la llave foránea apunta a un registro que no existe
                return $this->json($response, ['error' => 'Uno de los registros relacionados no existe.'], 422);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 3819) { #3819: no se cumple un CHECK de la tabla
                return $this->json($response, ['error' => 'Las personas y los montos deben ser mayores a 0.'], 422);
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
        $tourProgramadoId = filter_var($params['tour_programado_id'] ?? '', FILTER_VALIDATE_INT);
        $clienteId = filter_var($params['cliente_id'] ?? '', FILTER_VALIDATE_INT);
        $estado = trim((string) ($params['estado'] ?? ''));
        $cliente = trim((string) ($params['cliente'] ?? ''));
        $tour = trim((string) ($params['tour'] ?? ''));
        $fecha = trim((string) ($params['fecha'] ?? ''));

        TourProgramado::actualizarEstados();

        $query = ReservaTourModel::query()
            ->select([
                'reservas_tour.id',
                'reservas_tour.codigo',
                'reservas_tour.tour_programado_id',
                'tours.nombre as tour_nombre',
                'tours_programados.fecha_hora_inicio',
                'tours_programados.estado as salida_estado',
                'reservas_tour.cliente_id',
                'clientes.nombre as cliente_nombre',
                'clientes.apellidos as cliente_apellidos',
                'clientes.identificacion as cliente_identificacion',
                'reservas_tour.personas',
                'reservas_tour.precio_persona',
                'reservas_tour.total',
                'reservas_tour.estado'
            ])
            ->selectRaw("COALESCE((SELECT SUM(ROUND(p.monto * p.tipo_cambio, 2)) FROM pagos p WHERE p.reserva_tour_id = reservas_tour.id), 0) AS pagado")
            ->leftJoin('tours_programados', 'reservas_tour.tour_programado_id', '=', 'tours_programados.id')
            ->leftJoin('tours', 'tours_programados.tour_id', '=', 'tours.id')
            ->leftJoin('usuarios as clientes', 'reservas_tour.cliente_id', '=', 'clientes.id');

        if ($codigo !== '') {
            $query->where('reservas_tour.codigo', 'like', "%{$codigo}%");
        }
        if ($tourProgramadoId !== false) {
            $query->where('reservas_tour.tour_programado_id', $tourProgramadoId);
        }
        if ($clienteId !== false) {
            $query->where('reservas_tour.cliente_id', $clienteId);
        }
        if ($estado !== '') {
            $query->where('reservas_tour.estado', $estado);
        }
        if ($cliente !== '') {
            $query->where(function ($condicion) use ($cliente) {
                $condicion->whereRaw("CONCAT(clientes.nombre, ' ', clientes.apellidos) LIKE ?", ["%{$cliente}%"])
                    ->orWhere('clientes.identificacion', 'like', "%{$cliente}%");
            });
        }
        if ($tour !== '') {
            $query->where('tours.nombre', 'like', "%{$tour}%");
        }
        if ($fecha !== '') {
            $query->whereDate('tours_programados.fecha_hora_inicio', $fecha);
        }

        $total = (clone $query)->count('reservas_tour.id');

        $reservas = $query
            ->orderBy('tours_programados.fecha_hora_inicio', 'desc')
            ->orderBy('reservas_tour.codigo')
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
            $reserva = ReservaTourModel::find($args['id']);
 
            if ($reserva === null) {
                return $this->json($response, ['error' => 'Reserva de tour no encontrada.'], 404);
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

            if (isset($data['tour_programado_id'])) {
                $tourProgramadoId = filter_var($data['tour_programado_id'], FILTER_VALIDATE_INT);
                if ($tourProgramadoId === false || $tourProgramadoId < 1) {
                    return $this->json($response, ['error' => 'Tour programado inválido.'], 422);
                }
                $reserva->tour_programado_id = $tourProgramadoId;
            }

            if (isset($data['cliente_id'])) {
                $clienteId = filter_var($data['cliente_id'], FILTER_VALIDATE_INT);
                if ($clienteId === false || $clienteId < 1) {
                    return $this->json($response, ['error' => 'Cliente inválido.'], 422);
                }
                $reserva->cliente_id = $clienteId;
            }

            if (isset($data['personas'])) {
                $personas = filter_var($data['personas'], FILTER_VALIDATE_INT);
                if ($personas === false || $personas < 1) {
                    return $this->json($response, ['error' => 'Cantidad de personas inválida.'], 422);
                }
                $reserva->personas = $personas;
            }

            if (isset($data['precio_persona'])) {
                $precioPersona = $data['precio_persona'];
                if (!is_numeric($precioPersona) || $precioPersona <= 0) {
                    return $this->json($response, ['error' => 'Precio por persona inválido.'], 422);
                }
                $reserva->precio_persona = $precioPersona;
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
                    return $this->json($response, ['error' => 'Las personas y los montos deben ser mayores a 0.'], 422);
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
            $reserva = ReservaTourModel::find($args['id']);
 
            if ($reserva === null) {
                return $this->json($response, ['error' => 'Reserva de tour no encontrada.'], 404);
            }
 
            try {
                $reserva->delete();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1451) { #1451: otros registros dependen de este
                    return $this->json($response, ['error' => 'No se puede eliminar porque tiene registros asociados.'], 409);
                }
 
                throw $exception;
            }
 
            return $this->json($response, ['message' => 'Reserva de tour eliminada correctamente.'], 200);
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
