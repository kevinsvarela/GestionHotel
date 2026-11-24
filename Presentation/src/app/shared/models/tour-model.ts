export interface TourModel {
  id?: number;
  nombre: string;
  descripcion?: string | null;
  duracion_horas: number;
  precio_persona: number;
  cupo_maximo: number;
  punto_encuentro: string;
  latitud?: number | null;
  longitud?: number | null;
  foto_url?: string | null;
  activo?: number;
}

export interface TourInput {
  nombre: string;
  descripcion: string;
  duracion_horas: number;
  precio_persona: number;
  cupo_maximo: number;
  punto_encuentro: string;
  latitud: number | null;
  longitud: number | null;
  activo: number;
}
