export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'SINPE';
export type MonedaPago = 'CRC' | 'USD';
export type TipoReservaPago = 'HABITACION' | 'TOUR';

export interface PagoModel {
  id?: number;
  reserva_habitacion_id?: number | null;
  reserva_tour_id?: number | null;
  codigo_reserva?: string;
  cliente_nombre?: string;
  cliente_apellidos?: string;
  registrado_por?: number;
  registrado_por_nombre?: string;
  monto: number;
  moneda: MonedaPago;
  metodo: MetodoPago;
  referencia?: string | null;
  pagado_at: string;
}

export interface PagoInput {
  reserva_habitacion_id: number | null;
  reserva_tour_id: number | null;
  monto: number;
  moneda: MonedaPago;
  metodo: MetodoPago;
  referencia: string;
  pagado_at: string;
}
