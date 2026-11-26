<?php

namespace App\controllers;

use Slim\Routing\RouteCollectorProxy;
use App\Services\RolMiddleware;

#Permisos por rol: se agregan a cada ruta con ->add()
$soloAdmin = new RolMiddleware([RolMiddleware::ADMIN]);
$personal = new RolMiddleware([RolMiddleware::ADMIN, RolMiddleware::RECEPCIONISTA]);
$todos = new RolMiddleware([RolMiddleware::ADMIN, RolMiddleware::RECEPCIONISTA, RolMiddleware::CLIENTE]);

$app->group('/api', function(RouteCollectorProxy $api) use ($soloAdmin, $personal, $todos) {
    $api->group('/auth', function(RouteCollectorProxy $endpoint) {
        $endpoint->post('/login', Auth::class . ':login');
        $endpoint->delete('/loggout/{id}', Auth::class . ':loggout');
        $endpoint->patch('/refresh-session/{id}', Auth::class . ':refreshSession');
    });
    $api->group('/roles', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $personal) {
        $endpoint->get('[/{id}]',Rol::class . ':read')->add($personal);
        $endpoint->get('/filter/{offset}/{limit}',Rol::class . ':filter')->add($personal);
        $endpoint->post('',Rol::class .':create')->add($soloAdmin);
        $endpoint->put('/{id}',Rol::class. ':update')->add($soloAdmin);
        $endpoint->delete('/{id}',Rol::class . ':delete')->add($soloAdmin);
    });
    #La recepcionista solo puede crear o modificar clientes (se revisa en el controlador)
    $api->group('/usuarios', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $personal) {
        $endpoint->get('[/{id}]',Usuario::class . ':read')->add($personal);
        $endpoint->get('/filter/{offset}/{limit}',Usuario::class . ':filter')->add($personal);
        $endpoint->post('',Usuario::class .':create')->add($personal);
        $endpoint->put('/{id}',Usuario::class. ':update')->add($personal);
        $endpoint->delete('/{id}',Usuario::class . ':delete')->add($soloAdmin);
    });
    $api->group('/tipos-habitacion', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('[/{id}]',TipoHabitacion::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',TipoHabitacion::class . ':filter')->add($todos);
        $endpoint->post('',TipoHabitacion::class .':create')->add($soloAdmin);
        $endpoint->put('/{id}',TipoHabitacion::class. ':update')->add($soloAdmin);
        $endpoint->delete('/{id}',TipoHabitacion::class . ':delete')->add($soloAdmin);
    });
    $api->group('/servicios-habitacion', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('[/{id}]',ServicioHabitacion::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',ServicioHabitacion::class . ':filter')->add($todos);
        $endpoint->post('',ServicioHabitacion::class .':create')->add($soloAdmin);
        $endpoint->put('/{id}',ServicioHabitacion::class. ':update')->add($soloAdmin);
        $endpoint->delete('/{id}',ServicioHabitacion::class . ':delete')->add($soloAdmin);
    });
    $api->group('/habitaciones', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('[/{id}]',Habitacion::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',Habitacion::class . ':filter')->add($todos);
        $endpoint->post('',Habitacion::class .':create')->add($soloAdmin);
        $endpoint->put('/{id}',Habitacion::class. ':update')->add($soloAdmin);
        $endpoint->delete('/{id}',Habitacion::class . ':delete')->add($soloAdmin);
    });
    $api->group('/guias', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('[/{id}]',Guia::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',Guia::class . ':filter')->add($todos);
        $endpoint->post('',Guia::class .':create')->add($soloAdmin);
        $endpoint->put('/{id}',Guia::class. ':update')->add($soloAdmin);
        $endpoint->delete('/{id}',Guia::class . ':delete')->add($soloAdmin);
    });
    $api->group('/idiomas', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('[/{id}]',Idioma::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',Idioma::class . ':filter')->add($todos);
        $endpoint->post('',Idioma::class .':create')->add($soloAdmin);
        $endpoint->put('/{id}',Idioma::class. ':update')->add($soloAdmin);
        $endpoint->delete('/{id}',Idioma::class . ':delete')->add($soloAdmin);
    });
    $api->group('/tours', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('[/{id}]',Tour::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',Tour::class . ':filter')->add($todos);
        $endpoint->post('',Tour::class .':create')->add($soloAdmin);
        $endpoint->put('/{id}',Tour::class. ':update')->add($soloAdmin);
        $endpoint->delete('/{id}',Tour::class . ':delete')->add($soloAdmin);
    });
    $api->group('/tours-programados', function(RouteCollectorProxy $endpoint) use ($personal, $todos) {
        $endpoint->get('[/{id}]',TourProgramado::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',TourProgramado::class . ':filter')->add($todos);
        $endpoint->post('',TourProgramado::class .':create')->add($personal);
        $endpoint->put('/{id}',TourProgramado::class. ':update')->add($personal);
        $endpoint->delete('/{id}',TourProgramado::class . ':delete')->add($personal);
    });
    #El cliente solo ve y crea sus propias reservas (se revisa en el controlador)
    $api->group('/reservas-habitacion', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $personal, $todos) {
        $endpoint->get('[/{id}]',ReservaHabitacion::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',ReservaHabitacion::class . ':filter')->add($todos);
        $endpoint->post('',ReservaHabitacion::class .':create')->add($todos);
        $endpoint->put('/{id}',ReservaHabitacion::class. ':update')->add($personal);
        $endpoint->delete('/{id}',ReservaHabitacion::class . ':delete')->add($soloAdmin);
    });
    $api->group('/reservas-tour', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $personal, $todos) {
        $endpoint->get('[/{id}]',ReservaTour::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',ReservaTour::class . ':filter')->add($todos);
        $endpoint->post('',ReservaTour::class .':create')->add($todos);
        $endpoint->put('/{id}',ReservaTour::class. ':update')->add($personal);
        $endpoint->delete('/{id}',ReservaTour::class . ':delete')->add($soloAdmin);
    });
    $api->group('/dashboard', function(RouteCollectorProxy $endpoint) use ($personal) {
        $endpoint->get('',Dashboard::class . ':resumen')->add($personal);
    });
    $api->group('/reportes', function(RouteCollectorProxy $endpoint) use ($personal) {
        $endpoint->get('/{tipo}',Reporte::class . ':generar')->add($personal);
    });
    $api->group('/tipo-cambio', function(RouteCollectorProxy $endpoint) use ($personal) {
        $endpoint->get('',TipoCambio::class . ':hoy')->add($personal);
    });
    $api->group('/pagos', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $personal) {
        $endpoint->get('[/{id}]',Pago::class . ':read')->add($personal);
        $endpoint->get('/filter/{offset}/{limit}',Pago::class . ':filter')->add($personal);
        $endpoint->post('',Pago::class .':create')->add($personal);
        $endpoint->patch('/{id}/anular',Pago::class . ':anular')->add($soloAdmin);
    });
    $api->group('/servicios-incluidos', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('',ServicioIncluido::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',ServicioIncluido::class . ':filter')->add($todos);
        $endpoint->post('',ServicioIncluido::class .':create')->add($soloAdmin);
        $endpoint->delete('/{tipo_habitacion_id}/{servicio_habitacion_id}',ServicioIncluido::class . ':delete')->add($soloAdmin);
    });
    $api->group('/idiomas-guia', function(RouteCollectorProxy $endpoint) use ($soloAdmin, $todos) {
        $endpoint->get('',IdiomaGuia::class . ':read')->add($todos);
        $endpoint->get('/filter/{offset}/{limit}',IdiomaGuia::class . ':filter')->add($todos);
        $endpoint->post('',IdiomaGuia::class .':create')->add($soloAdmin);
        $endpoint->delete('/{guia_id}/{idioma_id}',IdiomaGuia::class . ':delete')->add($soloAdmin);
    });
});
