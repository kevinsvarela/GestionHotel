type Numero = number | string;

export interface MovimientoHabitacion {
  id: number;
  codigo: string;
  cliente: string;
  habitacion: string;
  tipo: string;
  huespedes: number;
  fecha_entrada?: string;
  fecha_salida?: string;
  estado: string;
  total: Numero;
  pagado: Numero;
}

export interface TourDelDia {
  id: number;
  tour: string;
  fecha_hora_inicio: string;
  estado: string;
  cupo: number;
  guia: string | null;
  punto_encuentro: string;
  reservados: Numero;
}

export interface ReservaPorCobrar {
  id: number;
  codigo: string;
  cliente: string;
  cliente_id: number;
  habitacion: string;
  fecha_entrada: string;
  estado: string;
  total: Numero;
  pagado: Numero;
}

export interface DashboardModel {
  fecha: string;
  habitaciones: {
    total: number;
    disponibles: number;
    mantenimiento: number;
    fuera_servicio: number;
    ocupadas: number;
  };
  en_casa: { reservas: number; huespedes: number };
  llegadas: MovimientoHabitacion[];
  salidas: MovimientoHabitacion[];
  ocupacion_semana: { fecha: string; ocupadas: number }[];
  tours_hoy: TourDelDia[];
  cobrado_hoy: { pagos: number; total: number };
  cobrado_mes: { pagos: number; total: number };
  cobros_semana: { fecha: string; total: number }[];
  saldo_pendiente: {
    hospedaje: { reservas: number; saldo: number };
    tours: { reservas: number; saldo: number };
  };
  por_cobrar: ReservaPorCobrar[];
}
