<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PagoModel extends Model {
    protected $table = 'pagos';

    public $timestamps = false;

    protected $fillable = [
        'reserva_habitacion_id',
        'reserva_tour_id',
        'registrado_por',
        'monto',
        'moneda',
        'tipo_cambio',
        'metodo',
        'referencia',
        'pagado_at',
    ];

    protected $casts = [
        'id' => 'integer',
        'reserva_habitacion_id' => 'integer',
        'reserva_tour_id' => 'integer',
        'registrado_por' => 'integer',
        'monto' => 'float',
        'tipo_cambio' => 'float',
    ];
}
