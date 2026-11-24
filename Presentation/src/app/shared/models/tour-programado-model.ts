export type EstadoTourProgramado = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export interface TourProgramadoModel {
  id?: number;
  tour_id: number;
  tour_nombre?: string;
  guia_id?: number | null;
  guia_nombre?: string | null;
  fecha_hora_inicio: string;
  cupo: number;
  estado: EstadoTourProgramado;
  reservados?: number;
  precio_persona?: number;
  duracion_minutos?: number;
  punto_encuentro?: string;
}

export interface TourProgramadoInput {
  tour_id: number;
  guia_id: number | null;
  fecha_hora_inicio: string;
  cupo: number;
  estado: EstadoTourProgramado;
}
