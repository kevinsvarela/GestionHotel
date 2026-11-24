export type EstadoReservaHabitacion = 'PENDIENTE' | 'CONFIRMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';

export interface ReservaHabitacionModel {
  id?: number;
  codigo?: string;
  cliente_id: number;
  cliente_nombre?: string;
  cliente_apellidos?: string;
  cliente_identificacion?: string | null;
  habitacion_id: number;
  habitacion_numero?: string;
  tipo_habitacion_nombre?: string;
  registrada_por?: number | null;
  fecha_entrada: string;
  fecha_salida: string;
  huespedes: number;
  precio_noche?: number;
  total?: number;
  estado: EstadoReservaHabitacion;
  checkin_at?: string | null;
  checkout_at?: string | null;
}

export interface ReservaHabitacionInput {
  cliente_id: number;
  habitacion_id: number;
  fecha_entrada: string;
  fecha_salida: string;
  huespedes: number;
  estado: EstadoReservaHabitacion;
}
