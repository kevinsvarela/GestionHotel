<?php
 
namespace App\controllers;
 
use App\Models\UsuarioModel;
use Illuminate\Database\QueryException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Container\ContainerInterface;
 
class Usuario {
    private const ROL_CLIENTE = 3;

    private ContainerInterface $container;
 
    public function __construct(ContainerInterface $c){
        $this->container = $c;
    }
 
     public function read(Request $request, Response $response, array $args): Response {
        $this->container->get('eloquent');
        if(isset($args['id'])){
            $usuario = UsuarioModel::query()
                ->select(['id', 'rol_id', 'nombre', 'apellidos', 'identificacion', 'email', 'username', 'telefono', 'activo'])
                ->find($args['id']);
 
            if ($usuario === null) {
                return $this->json($response, ['error' => 'Usuario no encontrado.'], 404);
            }
 
            return $this->json($response, ['data' => $usuario], 200);
        }
 
        $usuarios = UsuarioModel::query()
                ->select(['id', 'rol_id', 'nombre', 'apellidos', 'identificacion', 'email', 'username', 'telefono', 'activo'])
                ->get()
                ->toArray();
            return $this->json($response, ['data' => $usuarios], 200);
    }
 
 
    public function create(Request $request, Response $response, array $args): Response {
        $data = $request->getParsedBody();
 
        $data = is_array($data) ? $data : [];
 
        $errors = [];
        $rolId = filter_var($data['rol_id'] ?? '', FILTER_VALIDATE_INT);
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $apellidos = trim((string) ($data['apellidos'] ?? ''));
        $identificacion = isset($data['identificacion']) ? mb_strtoupper(trim((string) $data['identificacion'])) : null;
        $email = trim((string) ($data['email'] ?? ''));
        $username = isset($data['username']) ? trim((string) $data['username']) : null;
        $password = (string) ($data['password'] ?? '');
        $telefono = isset($data['telefono']) ? trim((string) $data['telefono']) : null;
        $activo = filter_var($data['activo'] ?? 1, FILTER_VALIDATE_INT);
 
        if ($rolId === false || $rolId < 1) {
            $errors['rol_id'] = 'Es obligatorio y debe ser un id válido.';
        }
        if ($nombre === '' || mb_strlen($nombre) > 80) {
            $errors['nombre'] = 'Es obligatorio y debe tener máximo 80 caracteres.';
        }
        if ($apellidos === '' || mb_strlen($apellidos) > 120) {
            $errors['apellidos'] = 'Es obligatorio y debe tener máximo 120 caracteres.';
        }
        if ($email === '' || mb_strlen($email) > 150) {
            $errors['email'] = 'Es obligatorio y debe tener máximo 150 caracteres.';
        }
        if ($identificacion !== null && mb_strlen($identificacion) > 20) {
            $errors['identificacion'] = 'Debe tener máximo 20 caracteres.';
        }
        if ($identificacion !== null && $identificacion === '') {
            $identificacion = null;
        }
        if ($username !== null && mb_strlen($username) > 50) {
            $errors['username'] = 'Debe tener máximo 50 caracteres.';
        }
        if ($username !== null && $username === '') {
            $username = null;
        }
        if ($password === '' && $rolId === self::ROL_CLIENTE) {
            $password = bin2hex(random_bytes(24));
        }
        if (mb_strlen($password) < 8 || mb_strlen($password) > 64) {
            $errors['password'] = 'Es obligatoria y debe tener entre 8 y 64 caracteres.';
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
            $usuario = UsuarioModel::create([
                'rol_id' => $rolId,
                'nombre' => $nombre,
                'apellidos' => $apellidos,
                'identificacion' => $identificacion,
                'email' => $email,
                'username' => $username,
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'telefono' => $telefono,
                'activo' => $activo,
            ]);
        } catch (QueryException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 1062) { #1062: el valor ya existe en una columna UNIQUE
                $message = (string) ($exception->errorInfo[2] ?? '');

                if (str_contains($message, 'identificacion')) {
                    return $this->json($response, ['error' => 'La identificación ya está registrada.'], 409);
                }
                if (str_contains($message, 'username')) {
                    return $this->json($response, ['error' => 'El nombre de usuario ya está registrado.'], 409);
                }

                return $this->json($response, ['error' => 'El email ya está registrado.'], 409);
            }
            if ((int) ($exception->errorInfo[1] ?? 0) === 1452) { #1452: la llave foránea apunta a un registro que no existe
                return $this->json($response, ['error' => 'Uno de los registros relacionados no existe.'], 422);
            }
            throw $exception;
        }
 
        return $this->json($response, ['data' => [
            'id' => $usuario->id,
            'rol_id' => $usuario->rol_id,
            'nombre' => $usuario->nombre,
            'apellidos' => $usuario->apellidos,
            'identificacion' => $usuario->identificacion,
            'email' => $usuario->email,
            'username' => $usuario->username,
            'telefono' => $usuario->telefono,
            'activo' => $usuario->activo,
        ]], 201);
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
        $apellidos = trim((string) ($params['apellidos'] ?? ''));
        $email = trim((string) ($params['email'] ?? ''));
        $identificacion = trim((string) ($params['identificacion'] ?? ''));
        $username = trim((string) ($params['username'] ?? ''));
        $telefono = trim((string) ($params['telefono'] ?? ''));
        $rol = trim((string) ($params['rol'] ?? ''));
        $rolId = filter_var($params['rol_id'] ?? '', FILTER_VALIDATE_INT);
        $excluirRolId = filter_var($params['excluir_rol_id'] ?? '', FILTER_VALIDATE_INT);
        $activo = filter_var($params['activo'] ?? '', FILTER_VALIDATE_INT);

        $query = UsuarioModel::query()
            ->select([
                'usuarios.id',
                'usuarios.rol_id',
                'roles.nombre as rol_nombre',
                'usuarios.nombre',
                'usuarios.apellidos',
                'usuarios.identificacion',
                'usuarios.email',
                'usuarios.username',
                'usuarios.telefono',
                'usuarios.activo'
            ])
            ->join('roles', 'usuarios.rol_id', '=', 'roles.id');

        if ($nombre !== '') {
            $query->where('usuarios.nombre', 'like', "%{$nombre}%");
        }
        if ($apellidos !== '') {
            $query->where('usuarios.apellidos', 'like', "%{$apellidos}%");
        }
        if ($email !== '') {
            $query->where('usuarios.email', 'like', "%{$email}%");
        }
        if ($identificacion !== '') {
            $query->where('usuarios.identificacion', 'like', "%{$identificacion}%");
        }
        if ($username !== '') {
            $query->where('usuarios.username', 'like', "%{$username}%");
        }
        if ($telefono !== '') {
            $query->where('usuarios.telefono', 'like', "%{$telefono}%");
        }
        if ($rol !== '') {
            $query->where('roles.nombre', 'like', "%{$rol}%");
        }
        if ($rolId !== false) {
            $query->where('usuarios.rol_id', $rolId);
        }
        if ($excluirRolId !== false) {
            $query->where('usuarios.rol_id', '<>', $excluirRolId);
        }
        if ($activo !== false) {
            $query->where('usuarios.activo', $activo);
        }

        $total = (clone $query)->count('usuarios.id');

        $usuarios = $query
            ->orderBy('usuarios.nombre')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();

        return $this->json($response, [
            'data' => $usuarios,
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
            $usuario = UsuarioModel::find($args['id']);
 
            if ($usuario === null) {
                return $this->json($response, ['error' => 'Usuario no encontrado.'], 404);
            }
 
            $data = $request->getParsedBody();
            $data = is_array($data) ? $data : [];
 
            if (isset($data['rol_id'])) {
                $rolId = filter_var($data['rol_id'], FILTER_VALIDATE_INT);
                if ($rolId === false || $rolId < 1) {
                    return $this->json($response, ['error' => 'Rol inválido.'], 422);
                }
                $usuario->rol_id = $rolId;
            }

            if (isset($data['nombre'])) {
                $nombre = trim((string) $data['nombre']);
                if ($nombre === '' || mb_strlen($nombre) > 80) {
                    return $this->json($response, ['error' => 'Nombre inválido.'], 422);
                }
                $usuario->nombre = $nombre;
            }

            if (isset($data['apellidos'])) {
                $apellidos = trim((string) $data['apellidos']);
                if ($apellidos === '' || mb_strlen($apellidos) > 120) {
                    return $this->json($response, ['error' => 'Apellidos inválidos.'], 422);
                }
                $usuario->apellidos = $apellidos;
            }

            if (array_key_exists('identificacion', $data)) {
                $identificacion = mb_strtoupper(trim((string) $data['identificacion']));
                if (mb_strlen($identificacion) > 20) {
                    return $this->json($response, ['error' => 'Identificación inválida.'], 422);
                }
                $usuario->identificacion = $identificacion === '' ? null : $identificacion;
            }

            if (isset($data['email'])) {
                $email = trim((string) $data['email']);
                if ($email === '' || mb_strlen($email) > 150) {
                    return $this->json($response, ['error' => 'Email inválido.'], 422);
                }
                $usuario->email = $email;
            }

            if (isset($data['username'])) {
                $username = trim((string) $data['username']);
                if ($username === '' || mb_strlen($username) > 50) {
                    return $this->json($response, ['error' => 'Nombre de usuario inválido.'], 422);
                }
                $usuario->username = $username;
            }

            if (isset($data['password'])) {
                $password = (string) $data['password'];
                if (mb_strlen($password) < 8 || mb_strlen($password) > 64) {
                    return $this->json($response, ['error' => 'Contraseña inválida.'], 422);
                }
                $usuario->password = password_hash($password, PASSWORD_DEFAULT);
            }

            if (isset($data['telefono'])) {
                $telefono = trim((string) $data['telefono']);
                if (mb_strlen($telefono) > 20) {
                    return $this->json($response, ['error' => 'Teléfono inválido.'], 422);
                }
                $usuario->telefono = $telefono === '' ? null : $telefono;
            }

            if (isset($data['activo'])) {
                $activo = filter_var($data['activo'], FILTER_VALIDATE_INT);
                if ($activo === false || $activo < 0 || $activo > 1) {
                    return $this->json($response, ['error' => 'Valor de activo inválido.'], 422);
                }
                $usuario->activo = $activo;
            }

            try {
                $usuario->save();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1062) { #1062: el valor ya existe en una columna UNIQUE
                    $message = (string) ($exception->errorInfo[2] ?? '');

                    if (str_contains($message, 'identificacion')) {
                        return $this->json($response, ['error' => 'La identificación ya está registrada.'], 409);
                    }
                    if (str_contains($message, 'username')) {
                        return $this->json($response, ['error' => 'El nombre de usuario ya está registrado.'], 409);
                    }

                    return $this->json($response, ['error' => 'El email ya está registrado.'], 409);
                }
                if ((int) ($exception->errorInfo[1] ?? 0) === 1452) { #1452: la llave foránea apunta a un registro que no existe
                    return $this->json($response, ['error' => 'Uno de los registros relacionados no existe.'], 422);
                }
                throw $exception;
            }
 
            return $this->json($response, ['data' => [
                'id' => $usuario->id,
                'rol_id' => $usuario->rol_id,
                'nombre' => $usuario->nombre,
                'apellidos' => $usuario->apellidos,
                'identificacion' => $usuario->identificacion,
                'email' => $usuario->email,
                'username' => $usuario->username,
                'telefono' => $usuario->telefono,
                'activo' => $usuario->activo,
            ]], 200);
        }
    }
 
    public function delete(Request $request, Response $response, array $args): Response {
        $eloquent = $this->container->get('eloquent');
        if (isset($args['id'])) {
            $usuario = UsuarioModel::find($args['id']);
 
            if ($usuario === null) {
                return $this->json($response, ['error' => 'Usuario no encontrado.'], 404);
            }
 
            try {
                $usuario->delete();
            } catch (QueryException $exception) {
                if ((int) ($exception->errorInfo[1] ?? 0) === 1451) { #1451: otros registros dependen de este
                    return $this->json($response, ['error' => 'No se puede eliminar porque tiene registros asociados.'], 409);
                }
 
                throw $exception;
            }
 
            return $this->json($response, ['message' => 'Usuario eliminado correctamente.'], 200);
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
