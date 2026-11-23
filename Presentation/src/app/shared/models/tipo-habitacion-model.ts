export interface TipoHabitacionModel {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  capacidad: number;
  precio_noche: number;
  foto_url?: string;
  activo?: number;
}

export type TipoHabitacionInput = Omit<TipoHabitacionModel, 'id' | 'foto_url'> & {
  descripcion: string;
  activo: number;
};
