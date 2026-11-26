<?php

namespace App\controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Routing\RouteCollectorProxy;


$app->group('/api', function (RouteCollectorProxy $api) {
    $api->group('/auth', function (RouteCollectorProxy $endpoint) {
        $endpoint->post('/credentials', Auth::class . ':credentials');
        $endpoint->put('/tkref/{id}', Auth::class . ':updateTokenRef');
        $endpoint->post('/verify/{id}', Auth::class . ':verifyToken');
    });
    $api->group('/roles', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', Rol::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', Rol::class . ':filter');
        $endpoint->post('', Rol::class . ':create');
        $endpoint->put('/{id}', Rol::class . ':update');
        $endpoint->delete('/{id}', Rol::class . ':delete');
    });
    $api->group('/usuarios', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', Usuario::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', Usuario::class . ':filter');
        $endpoint->post('', Usuario::class . ':create');
        $endpoint->put('/{id}', Usuario::class . ':update');
        $endpoint->delete('/{id}', Usuario::class . ':delete');
    });
    $api->group('/tipos-habitacion', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', TipoHabitacion::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', TipoHabitacion::class . ':filter');
        $endpoint->post('', TipoHabitacion::class . ':create');
        $endpoint->put('/{id}', TipoHabitacion::class . ':update');
        $endpoint->delete('/{id}', TipoHabitacion::class . ':delete');
    });
    $api->group('/servicios-habitacion', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', ServicioHabitacion::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', ServicioHabitacion::class . ':filter');
        $endpoint->post('', ServicioHabitacion::class . ':create');
        $endpoint->put('/{id}', ServicioHabitacion::class . ':update');
        $endpoint->delete('/{id}', ServicioHabitacion::class . ':delete');
    });
    $api->group('/habitaciones', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', Habitacion::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', Habitacion::class . ':filter');
        $endpoint->post('', Habitacion::class . ':create');
        $endpoint->put('/{id}', Habitacion::class . ':update');
        $endpoint->delete('/{id}', Habitacion::class . ':delete');
    });
    $api->group('/guias', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', Guia::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', Guia::class . ':filter');
        $endpoint->post('', Guia::class . ':create');
        $endpoint->put('/{id}', Guia::class . ':update');
        $endpoint->delete('/{id}', Guia::class . ':delete');
    });
    $api->group('/idiomas', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', Idioma::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', Idioma::class . ':filter');
        $endpoint->post('', Idioma::class . ':create');
        $endpoint->put('/{id}', Idioma::class . ':update');
        $endpoint->delete('/{id}', Idioma::class . ':delete');
    });
    $api->group('/tours', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', Tour::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', Tour::class . ':filter');
        $endpoint->post('', Tour::class . ':create');
        $endpoint->put('/{id}', Tour::class . ':update');
        $endpoint->delete('/{id}', Tour::class . ':delete');
    });
    $api->group('/tours-programados', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', TourProgramado::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', TourProgramado::class . ':filter');
        $endpoint->post('', TourProgramado::class . ':create');
        $endpoint->put('/{id}', TourProgramado::class . ':update');
        $endpoint->delete('/{id}', TourProgramado::class . ':delete');
    });
    $api->group('/reservas-habitacion', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', ReservaHabitacion::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', ReservaHabitacion::class . ':filter');
        $endpoint->post('', ReservaHabitacion::class . ':create');
        $endpoint->put('/{id}', ReservaHabitacion::class . ':update');
        $endpoint->delete('/{id}', ReservaHabitacion::class . ':delete');
    });
    $api->group('/reservas-tour', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', ReservaTour::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', ReservaTour::class . ':filter');
        $endpoint->post('', ReservaTour::class . ':create');
        $endpoint->put('/{id}', ReservaTour::class . ':update');
        $endpoint->delete('/{id}', ReservaTour::class . ':delete');
    });
    $api->group('/pagos', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('[/{id}]', Pago::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', Pago::class . ':filter');
        $endpoint->post('', Pago::class . ':create');
        $endpoint->put('/{id}', Pago::class . ':update');
        $endpoint->put('/{id}/anular', Pago::class . ':anular');
        $endpoint->delete('/{id}', Pago::class . ':delete');
    });
    $api->group('/servicios-incluidos', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('', ServicioIncluido::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', ServicioIncluido::class . ':filter');
        $endpoint->post('', ServicioIncluido::class . ':create');
        $endpoint->delete('/{tipo_habitacion_id}/{servicio_habitacion_id}', ServicioIncluido::class . ':delete');
    });
    $api->group('/dashboard', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('', Dashboard::class . ':resumen');
    });
    $api->group('/reportes', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('/ingresos', Reporte::class . ':ingresos');
        $endpoint->get('/ocupacion', Reporte::class . ':ocupacion');
        $endpoint->get('/reservas', Reporte::class . ':reservas');
        $endpoint->get('/tours', Reporte::class . ':tours');
    });
    $api->group('/idiomas-guia', function (RouteCollectorProxy $endpoint) {
        $endpoint->get('', IdiomaGuia::class . ':read');
        $endpoint->get('/filter/{offset}/{limit}', IdiomaGuia::class . ':filter');
        $endpoint->post('', IdiomaGuia::class . ':create');
        $endpoint->delete('/{guia_id}/{idioma_id}', IdiomaGuia::class . ':delete');
    });

});
