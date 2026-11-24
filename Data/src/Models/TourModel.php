<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TourModel extends Model {
    protected $table = 'tours';

    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'descripcion',
        'duracion_minutos',
        'precio_persona',
        'cupo_maximo',
        'punto_encuentro',
        'latitud',
        'longitud',
        'foto_url',
        'activo',
    ];

    protected $casts = [
        'id' => 'integer',
        'duracion_minutos' => 'integer',
        'precio_persona' => 'float',
        'cupo_maximo' => 'integer',
        'latitud' => 'float',
        'longitud' => 'float',
        'activo' => 'integer',
    ];
}
