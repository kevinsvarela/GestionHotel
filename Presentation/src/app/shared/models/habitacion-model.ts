export type EstadoHabitacion = 'DISPONIBLE' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

export interface HabitacionModel {
  id?: number;
  tipo_habitacion_id: number;
  tipo_habitacion_nombre?: string;
  numero: string;
  piso: number;
  estado: EstadoHabitacion;
}

export type HabitacionCreateInput = Omit<HabitacionModel, 'id' | 'tipo_habitacion_nombre'>;
