export interface ServicioHabitacionModel {
  id?: number;
  nombre: string;
}

export type ServicioHabitacionInput = Omit<ServicioHabitacionModel, 'id'>;
