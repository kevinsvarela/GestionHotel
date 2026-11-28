export interface ServicioHabitacionModel {
  id?: number;
  nombre: string;
}

export type ServicioHabitacionInput = Omit<ServicioHabitacionModel, 'id'>;

export interface ServicioIncluidoModel {
  tipo_habitacion_id: number;
  servicio_habitacion_id: number;
}
