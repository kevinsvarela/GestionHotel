<?php
 
namespace App\controllers;
 
use App\Models\GuiaModel;
use Illuminate\Database\QueryException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
 
class Guia {
    private ContainerInterface $container;
 
    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }
 
    public function read(Request $request, Response $response, array $args): Response {
        $this->container->get('eloquent');
        if(isset($args['id'])){
            $guia = GuiaModel::query()
                ->select(['id', 'nombre', 'telefono', 'activo'])
                ->find($args['id']);
 
            if ($guia === null) {
                return $this->json($response, ['error' => 'Guía no encontrado.'], 404);
            }
 
            return $this->json($response, ['data' => $guia], 200);
        }
 
        $guias = GuiaModel::query()
                ->select(['id', 'nombre', 'telefono', 'activo'])
                ->get()
                ->toArray();
            return $this->json($response, ['data' => $guias], 200);
    }
 

 
    public function create(Request $request, Response $response, array $args): Response {
        $data = $request->getParsedBody();
 
        $data = is_array($data) ? $data : [];
 
        $errors = [];
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $telefono = isset($data['telefono']) ? trim((string) $data['telefono']) : null;
        $activo = filter_var($data['activo'] ?? 1, FILTER_VALIDATE_INT);
 
        if ($nombre === '' || mb_strlen($nombre) > 120) {
            $errors['nombre'] = 'Es obligatorio y debe tener máximo 120 caracteres.';
        }
        if ($telefono !== null && mb_strlen($telefono) > 20) {
            $errors['telefono'] = 'Debe tener máximo 20 caracteres.';
        }
        if ($telefono !== null && $telefono === '') {
            $telefono = null;
        }
        if ($activo === false || $activo < 0 || $activo > 1) {
            $errors['activo'] = 'Debe ser 0 o 1.';
        }
 
        if ($errors !== []) {
            return $this->json($response, ['errors' => $errors], 422);
        }
 
        try {
            $this->container->get('eloquent');
            $guia = GuiaModel::create([
                'nombre' => $nombre,
                'telefono' => $telefono,
                'activo' => $activo,
            ]);
        } catch (QueryException $exception) {
            throw $exception;
        }
 
        return $this->json($response, ['data' => $guia->toArray()], 201);
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
        $telefono = trim((string) ($params['telefono'] ?? ''));
        $activo = filter_var($params['activo'] ?? '', FILTER_VALIDATE_INT);
        $idiomaId = filter_var($params['idioma_id'] ?? '', FILTER_VALIDATE_INT);

        $query = GuiaModel::query()
            ->select([
                'id',
                'nombre',
                'telefono',
                'activo'
            ]);

        if ($nombre !== '') {
            $query->where('nombre', 'like', "%{$nombre}%");
        }
        if ($telefono !== '') {
            $query->where('telefono', 'like', "%{$telefono}%");
        }
        if ($activo !== false) {
            $query->where('activo', $activo);
        }
        if ($idiomaId !== false) {
            $query->whereIn('id', function ($subconsulta) use ($idiomaId) {
                $subconsulta->select('guia_id')
                    ->from('idiomas_guia')
                    ->where('idioma_id', $idiomaId);
            });
        }

        $total = (clone $query)->count('id');

        $guias = $query
            ->orderBy('nombre')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();

        return $this->json($response, [
            'data' => $guias,
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
            $guia = GuiaModel::find($args['id']);
 
            if ($guia === null) {
                return $this->json($response, ['error' => 'Guía no encontrado.'], 404);
            }
 
            $data = $request->getParsedBody();
            $data = is_array($data) ? $data : [];
 
            if (isset($data['nombre'])) {
                $nombre = trim((string) $data['nombre']);
                if ($nombre === '' || mb_strlen($nombre) > 120) {
                    return $this->json($response, ['error' => 'Nombre inválido.'], 422);
                }
                $guia->nombre = $nombre;
            }

            if (isset($data['telefono'])) {
                $telefono = trim((string) $data['telefono']);
                if (mb_strlen($telefono) > 20) {
                    return $this->json($response, ['error' => 'Teléfono inválido.'], 422);
                }
                $guia->telefono = $telefono === '' ? null : $telefono;
            }

            if (isset($data['activo'])) {
                $activo = filter_var($data['activo'], FILTER_VALIDATE_INT);
                if ($activo === false || $activo < 0 || $activo > 1) {
                    return $this->json($response, ['error' => 'Valor de activo inválido.'], 422);
                }
                $guia->activo = $activo;
            }

            try {
                $guia->save();
            } catch (QueryException $exception) {
                throw $exception;
            }
 
            return $this->json($response, ['data' => $guia->toArray()], 200);
        }
    }
 
    public function delete(Request $request, Response $response, array $args): Response {
        $eloquent = $this->container->get('eloquent');
        if (isset($args['id'])) {
            $guia = GuiaModel::find($args['id']);
 
            if ($guia === null) {
                return $this->json($response, ['error' => 'Guía no encontrado.'], 404);
            }
 
            try {
                $guia->delete();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1451) { #1451: otros registros dependen de este
                    return $this->json($response, ['error' => 'No se puede eliminar porque tiene registros asociados.'], 409);
                }
 
                throw $exception;
            }
 
            return $this->json($response, ['message' => 'Guía eliminado correctamente.'], 200);
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
