export type EstadoReservaTour = 'PENDIENTE' | 'CONFIRMADA' | 'FINALIZADA' | 'CANCELADA';

export interface ReservaTourModel {
  id?: number;
  codigo?: string;
  tour_programado_id: number;
  tour_nombre?: string;
  fecha_hora_inicio?: string;
  salida_estado?: string;
  cliente_id: number;
  cliente_nombre?: string;
  cliente_apellidos?: string;
  cliente_identificacion?: string | null;
  personas: number;
  precio_persona?: number;
  total?: number;
  pagado?: number;
  estado: EstadoReservaTour;
}

export interface ReservaTourInput {
  tour_programado_id: number;
  cliente_id: number;
  personas: number;
  estado: EstadoReservaTour;
}
