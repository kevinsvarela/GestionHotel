export type TipoReporte = 'ingresos' | 'ocupacion' | 'reservas' | 'tours';

type Numero = number | string;

export interface ResumenIngreso {
  metodo: string;
  moneda: string;
  cantidad: Numero;
  total_moneda: Numero;
  total_crc: Numero;
}

export interface DetalleIngreso {
  id: number;
  pagado_at: string;
  codigo_reserva: string | null;
  cliente: string | null;
  metodo: string;
  moneda: string;
  monto: Numero;
  tipo_cambio: Numero;
  monto_crc: Numero;
  referencia: string | null;
}

export interface OcupacionTipo {
  id: number;
  nombre: string;
  habitaciones: Numero;
  reservas: Numero;
  noches_ocupadas: Numero;
  noches_disponibles: Numero;
  porcentaje: Numero;
  ingreso_estimado: Numero;
}

export interface ReservasEstado {
  estado: string;
  cantidad: Numero;
  total: Numero;
  pagado: Numero;
  saldo: Numero;
}

export interface VentaTour {
  id: number;
  nombre: string;
  salidas: Numero;
  cupo: Numero;
  personas: Numero;
  vendido: Numero;
  ocupacion: Numero;
}

export interface VentaGuia {
  guia_id: number | null;
  nombre: string;
  salidas: Numero;
  personas: Numero;
  vendido: Numero;
}

interface RangoReporte {
  desde: string;
  hasta: string;
}

export interface ReporteIngresos extends RangoReporte {
  reporte: 'ingresos';
  resumen: ResumenIngreso[];
  detalle: DetalleIngreso[];
}

export interface ReporteOcupacion extends RangoReporte {
  reporte: 'ocupacion';
  noches_rango: number;
  tipos: OcupacionTipo[];
}

export interface ReporteReservas extends RangoReporte {
  reporte: 'reservas';
  hospedaje: ReservasEstado[];
  tours: ReservasEstado[];
}

export interface ReporteTours extends RangoReporte {
  reporte: 'tours';
  tours: VentaTour[];
  guias: VentaGuia[];
}

export type DatosReporte = ReporteIngresos | ReporteOcupacion | ReporteReservas | ReporteTours;

export interface ConsultaReporte {
  tipo: TipoReporte;
  desde: string;
  hasta: string;
}
