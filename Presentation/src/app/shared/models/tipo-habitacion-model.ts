export interface TipoHabitacionModel {
  id?: number;
  nombre: string;
  descripcion?: string;
  capacidad: number;
  precio_noche: number;
  foto_url?: string;
  activo?: number;
}
