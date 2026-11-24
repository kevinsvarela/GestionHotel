<?php
 
namespace App\controllers;
 
use App\Models\TourModel;
use Illuminate\Database\QueryException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
 
class Tour {
    private ContainerInterface $container;
 
    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }
 
    public function read(Request $request, Response $response, array $args): Response {
        $this->container->get('eloquent');
        if(isset($args['id'])){
            $tour = TourModel::query()
                ->select(['id', 'nombre', 'descripcion', 'duracion_minutos', 'precio_persona', 'cupo_maximo', 'punto_encuentro', 'latitud', 'longitud', 'foto_url', 'activo'])
                ->find($args['id']);
 
            if ($tour === null) {
                return $this->json($response, ['error' => 'Tour no encontrado.'], 404);
            }
 
            return $this->json($response, ['data' => $tour], 200);
        }
 
        $tours = TourModel::query()
                ->select(['id', 'nombre', 'descripcion', 'duracion_minutos', 'precio_persona', 'cupo_maximo', 'punto_encuentro', 'latitud', 'longitud', 'foto_url', 'activo'])
                ->get()
                ->toArray();
            return $this->json($response, ['data' => $tours], 200);
    }
 
    public function create(Request $request, Response $response, array $args): Response {
        $data = $request->getParsedBody();
 
        $data = is_array($data) ? $data : [];
 
        $errors = [];
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $descripcion = isset($data['descripcion']) ? trim((string) $data['descripcion']) : null;
        $duracionMinutos = filter_var($data['duracion_minutos'] ?? '', FILTER_VALIDATE_INT);
        $precioPersona = $data['precio_persona'] ?? '';
        $cupoMaximo = filter_var($data['cupo_maximo'] ?? '', FILTER_VALIDATE_INT);
        $puntoEncuentro = trim((string) ($data['punto_encuentro'] ?? ''));
        $latitud = $data['latitud'] ?? null;
        $longitud = $data['longitud'] ?? null;
        $fotoUrl = isset($data['foto_url']) ? trim((string) $data['foto_url']) : null;
        $activo = filter_var($data['activo'] ?? 1, FILTER_VALIDATE_INT);
 
        if ($nombre === '' || mb_strlen($nombre) > 120) {
            $errors['nombre'] = 'Es obligatorio y debe tener máximo 120 caracteres.';
        }
        if ($descripcion !== null && mb_strlen($descripcion) > 1000) {
            $errors['descripcion'] = 'Debe tener máximo 1000 caracteres.';
        }
        if ($descripcion !== null && $descripcion === '') {
            $descripcion = null;
        }
        if ($duracionMinutos === false || $duracionMinutos < 1 || $duracionMinutos > 1440) {
            $errors['duracion_minutos'] = 'Es obligatorio y debe ser un número entero de minutos entre 1 y 1440.';
        }
        if (!is_numeric($precioPersona) || $precioPersona <= 0) {
            $errors['precio_persona'] = 'Es obligatorio, debe ser numérico y mayor a 0.';
        }
        if ($cupoMaximo === false || $cupoMaximo < 1) {
            $errors['cupo_maximo'] = 'Es obligatorio y debe ser un número entero mayor o igual a 1.';
        }
        if ($puntoEncuentro === '' || mb_strlen($puntoEncuentro) > 200) {
            $errors['punto_encuentro'] = 'Es obligatorio y debe tener máximo 200 caracteres.';
        }
        if ($latitud !== null && !is_numeric($latitud)) {
            $errors['latitud'] = 'Debe ser numérico.';
        }
        if ($longitud !== null && !is_numeric($longitud)) {
            $errors['longitud'] = 'Debe ser numérico.';
        }
        if ($fotoUrl !== null && mb_strlen($fotoUrl) > 255) {
            $errors['foto_url'] = 'Debe tener máximo 255 caracteres.';
        }
        if ($fotoUrl !== null && $fotoUrl === '') {
            $fotoUrl = null;
        }
        if ($activo === false || $activo < 0 || $activo > 1) {
            $errors['activo'] = 'Debe ser 0 o 1.';
        }
 
        if ($errors !== []) {
            return $this->json($response, ['errors' => $errors], 422);
        }
 
        try {
            $this->container->get('eloquent');
            $tour = TourModel::create([
                'nombre' => $nombre,
                'descripcion' => $descripcion,
                'duracion_minutos' => $duracionMinutos,
                'precio_persona' => $precioPersona,
                'cupo_maximo' => $cupoMaximo,
                'punto_encuentro' => $puntoEncuentro,
                'latitud' => $latitud,
                'longitud' => $longitud,
                'foto_url' => $fotoUrl,
                'activo' => $activo,
            ]);
        } catch (QueryException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 3819) { #3819: no se cumple un CHECK de la tabla
                return $this->json($response, ['error' => 'La duración, el precio y el cupo deben ser mayores a 0, y las coordenadas deben estar en rango.'], 422);
            }
            throw $exception;
        }
 
        return $this->json($response, ['data' => $tour->toArray()], 201);
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
        $nombre = trim((string) ($params['nombre'] ?? ''));
        $puntoEncuentro = trim((string) ($params['punto_encuentro'] ?? ''));
        $activo = filter_var($params['activo'] ?? '', FILTER_VALIDATE_INT);

        $query = TourModel::query()
            ->select([
                'id',
                'nombre',
                'descripcion',
                'duracion_minutos',
                'precio_persona',
                'cupo_maximo',
                'punto_encuentro',
                'latitud',
                'longitud',
                'foto_url',
                'activo'
            ]);

        if ($nombre !== '') {
            $query->where('nombre', 'like', "%{$nombre}%");
        }
        if ($puntoEncuentro !== '') {
            $query->where('punto_encuentro', 'like', "%{$puntoEncuentro}%");
        }
        if ($activo !== false) {
            $query->where('activo', $activo);
        }

        $total = (clone $query)->count('id');

        $tours = $query
            ->orderBy('nombre')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();

        return $this->json($response, [
            'data' => $tours,
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
            $tour = TourModel::find($args['id']);
 
            if ($tour === null) {
                return $this->json($response, ['error' => 'Tour no encontrado.'], 404);
            }
 
            $data = $request->getParsedBody();
            $data = is_array($data) ? $data : [];
 
            if (isset($data['nombre'])) {
                $nombre = trim((string) $data['nombre']);
                if ($nombre === '' || mb_strlen($nombre) > 120) {
                    return $this->json($response, ['error' => 'Nombre inválido.'], 422);
                }
                $tour->nombre = $nombre;
            }

            if (isset($data['descripcion'])) {
                $descripcion = trim((string) $data['descripcion']);
                if (mb_strlen($descripcion) > 1000) {
                    return $this->json($response, ['error' => 'Descripción inválida.'], 422);
                }
                $tour->descripcion = $descripcion === '' ? null : $descripcion;
            }

            if (isset($data['duracion_minutos'])) {
                $duracionMinutos = filter_var($data['duracion_minutos'], FILTER_VALIDATE_INT);
                if ($duracionMinutos === false || $duracionMinutos < 1 || $duracionMinutos > 1440) {
                    return $this->json($response, ['error' => 'Duración inválida.'], 422);
                }
                $tour->duracion_minutos = $duracionMinutos;
            }

            if (isset($data['precio_persona'])) {
                $precioPersona = $data['precio_persona'];
                if (!is_numeric($precioPersona) || $precioPersona <= 0) {
                    return $this->json($response, ['error' => 'Precio por persona inválido.'], 422);
                }
                $tour->precio_persona = $precioPersona;
            }

            if (isset($data['cupo_maximo'])) {
                $cupoMaximo = filter_var($data['cupo_maximo'], FILTER_VALIDATE_INT);
                if ($cupoMaximo === false || $cupoMaximo < 1) {
                    return $this->json($response, ['error' => 'Cupo máximo inválido.'], 422);
                }
                $tour->cupo_maximo = $cupoMaximo;
            }

            if (isset($data['punto_encuentro'])) {
                $puntoEncuentro = trim((string) $data['punto_encuentro']);
                if ($puntoEncuentro === '' || mb_strlen($puntoEncuentro) > 200) {
                    return $this->json($response, ['error' => 'Punto de encuentro inválido.'], 422);
                }
                $tour->punto_encuentro = $puntoEncuentro;
            }

            if (isset($data['latitud'])) {
                $latitud = $data['latitud'];
                if (!is_numeric($latitud)) {
                    return $this->json($response, ['error' => 'Latitud inválida.'], 422);
                }
                $tour->latitud = $latitud;
            }

            if (isset($data['longitud'])) {
                $longitud = $data['longitud'];
                if (!is_numeric($longitud)) {
                    return $this->json($response, ['error' => 'Longitud inválida.'], 422);
                }
                $tour->longitud = $longitud;
            }

            if (isset($data['foto_url'])) {
                $fotoUrl = trim((string) $data['foto_url']);
                if (mb_strlen($fotoUrl) > 255) {
                    return $this->json($response, ['error' => 'URL de la foto inválida.'], 422);
                }
                $tour->foto_url = $fotoUrl === '' ? null : $fotoUrl;
            }

            if (isset($data['activo'])) {
                $activo = filter_var($data['activo'], FILTER_VALIDATE_INT);
                if ($activo === false || $activo < 0 || $activo > 1) {
                    return $this->json($response, ['error' => 'Valor de activo inválido.'], 422);
                }
                $tour->activo = $activo;
            }

            try {
                $tour->save();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 3819) { #3819: no se cumple un CHECK de la tabla
                    return $this->json($response, ['error' => 'La duración, el precio y el cupo deben ser mayores a 0, y las coordenadas deben estar en rango.'], 422);
                }
                throw $exception;
            }
 
            return $this->json($response, ['data' => $tour->toArray()], 200);
        }
    }
 
    public function delete(Request $request, Response $response, array $args): Response {
        $eloquent = $this->container->get('eloquent');
        if (isset($args['id'])) {
            $tour = TourModel::find($args['id']);
 
            if ($tour === null) {
                return $this->json($response, ['error' => 'Tour no encontrado.'], 404);
            }
 
            try {
                $tour->delete();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1451) { #1451: otros registros dependen de este
                    return $this->json($response, ['error' => 'No se puede eliminar porque tiene registros asociados.'], 409);
                }
 
                throw $exception;
            }
 
            return $this->json($response, ['message' => 'Tour eliminado correctamente.'], 200);
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
