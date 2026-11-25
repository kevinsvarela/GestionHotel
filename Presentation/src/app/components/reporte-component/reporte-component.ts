import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { ReporteService } from '../../shared/services/reporte-service';
import { AuthService } from '../../shared/services/auth-service';
import { PrintService, SeccionReporte } from '../../shared/services/print.service';
import {
  DatosReporte, ReporteIngresos, ReporteOcupacion, ReporteReservas, ReporteTours, ReservasEstado, TipoReporte
} from '../../shared/models/reporte-model';

type RangoForm = {
  desde: string;
  hasta: string;
};

type ErrorCampo = { kind: string; message: string } | null;

interface OpcionReporte {
  tipo: TipoReporte;
  titulo: string;
  icono: string;
  descripcion: string;
}

interface Tarjeta {
  etiqueta: string;
  valor: string;
  icono: string;
}

interface SeccionVista extends SeccionReporte {
  filas: string[][];
  pie?: string[];
  claves: string[];
}

interface VistaReporte {
  tarjetas: Tarjeta[];
  secciones: SeccionVista[];
}

const MAXIMO_DIAS = 366;

const decimales = new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const enteros = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });

const METODOS: Record<string, string> = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', SINPE: 'SINPE Móvil' };
const ESTADOS: Record<string, string> = {
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', EN_CURSO: 'En curso', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada'
};

function num(valor: unknown): number {
  const numero = Number(valor ?? 0);
  return isNaN(numero) ? 0 : numero;
}

function colones(valor: unknown): string {
  return '₡' + decimales.format(num(valor)).replace(/\s/g, ' ');
}

function dolares(valor: unknown): string {
  return '$' + decimales.format(num(valor)).replace(/\s/g, ' ');
}

function cantidad(valor: unknown): string {
  return enteros.format(num(valor)).replace(/\s/g, ' ');
}

function porcentaje(valor: unknown): string {
  return `${num(valor).toFixed(1).replace('.', ',')} %`;
}

function sumar<T>(filas: T[], campo: (fila: T) => unknown): number {
  return filas.reduce((suma, fila) => suma + num(campo(fila)), 0);
}

function fechaTexto(valor: string): string {
  const [anio, mes, dia] = valor.substring(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

function fechaHoraTexto(valor: string): string {
  return `${fechaTexto(valor)} ${valor.substring(11, 16)}`;
}

function aIso(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

function dias(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000) + 1;
}

function seccion(titulo: string, columnas: string[], filas: string[][], derecha: number[], pie?: string[]): SeccionVista {
  return { titulo, columnas, filas, derecha, pie, claves: columnas.map((_, indice) => `c${indice}`) };
}

@Component({
  imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatTableModule, FormField],
  selector: 'app-reporte-component',
  styleUrl: './reporte-component.css',
  templateUrl: './reporte-component.html',
})
export class ReporteComponent {
  readonly srvReporte = inject(ReporteService);
  private readonly srvPrint = inject(PrintService);
  private readonly srvAuth = inject(AuthService);

  readonly reportes: OpcionReporte[] = [
    { tipo: 'ingresos', titulo: 'Ingresos por período', icono: 'payments',
      descripcion: 'Pagos registrados entre las fechas, agrupados por método y moneda.' },
    { tipo: 'ocupacion', titulo: 'Ocupación de habitaciones', icono: 'hotel',
      descripcion: 'Noches ocupadas frente a las disponibles, por tipo de habitación.' },
    { tipo: 'reservas', titulo: 'Reservas por estado', icono: 'event_note',
      descripcion: 'Reservas de hospedaje según la fecha de entrada y de tours según la fecha de salida.' },
    { tipo: 'tours', titulo: 'Tours más vendidos', icono: 'tour',
      descripcion: 'Personas, cupo usado y monto vendido por tour y por guía. No cuenta salidas ni reservas canceladas.' },
  ];

  tipo = signal<TipoReporte>('ingresos');

  readonly reporteActual = computed(() => this.reportes.find((opcion) => opcion.tipo === this.tipo())!);

  objRango = signal<RangoForm>(this.mesDe(new Date()));

  frmRango = form(this.objRango, (s) => {
    required(s.desde, { message: 'Indique la fecha inicial' });
    required(s.hasta, { message: 'Indique la fecha final' });
    validate(s.hasta, ({ value, valueOf }): ErrorCampo => {
      const desde = valueOf(s.desde);
      const hasta = value();
      if (desde === '' || hasta === '') {
        return null;
      }
      if (hasta < desde) {
        return { kind: 'orden', message: 'Debe ser igual o posterior a la fecha inicial' };
      }
      return dias(desde, hasta) > MAXIMO_DIAS
        ? { kind: 'rango', message: 'El rango no puede ser mayor a un año' }
        : null;
    });
  });

  readonly vista = computed<VistaReporte | null>(() => {
    const datos = this.srvReporte.reporte.value()?.data;
    const consulta = this.srvReporte.consulta();
    if (datos === undefined || consulta === null || datos.reporte !== consulta.tipo) {
      return null;
    }
    return this.construir(datos);
  });

  readonly mensajeError = computed(() => {
    const error = this.srvReporte.reporte.error() as { error?: { error?: string; errors?: Record<string, string> } } | undefined;
    if (!error) {
      return '';
    }
    const detalle = error.error;
    return detalle?.error ?? Object.values(detalle?.errors ?? {})[0] ?? 'No se pudo generar el reporte.';
  });

  constructor() {
    effect(() => {
      const tipo = this.tipo();
      const rango = this.objRango();
      const valido = this.frmRango().valid();
      if (valido) {
        untracked(() => this.srvReporte.consultar({ tipo, desde: rango.desde, hasta: rango.hasta }));
      }
    });
  }

  elegir(tipo: TipoReporte): void {
    this.tipo.set(tipo);
  }

  private mesDe(fecha: Date): RangoForm {
    return {
      desde: aIso(new Date(fecha.getFullYear(), fecha.getMonth(), 1)),
      hasta: aIso(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)),
    };
  }

  esteMes(): void {
    this.objRango.set(this.mesDe(new Date()));
  }

  mesAnterior(): void {
    const hoy = new Date();
    this.objRango.set(this.mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)));
  }

  esteAnio(): void {
    const anio = new Date().getFullYear();
    this.objRango.set({ desde: `${anio}-01-01`, hasta: `${anio}-12-31` });
  }

  exportar(guardar: boolean): void {
    const vista = this.vista();
    const consulta = this.srvReporte.consulta();
    if (vista === null || consulta === null) {
      return;
    }
    const ahora = new Date();
    const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const usuario = this.srvAuth.userActualS().username;
    this.srvPrint.imprimir({
      titulo: this.reporteActual().titulo,
      subtitulo: `Del ${fechaTexto(consulta.desde)} al ${fechaTexto(consulta.hasta)} · Generado el ${fechaTexto(aIso(ahora))} ${hora}`
        + (usuario ? ` por ${usuario}` : ''),
      resumen: vista.tarjetas.map((tarjeta) => `${tarjeta.etiqueta}: ${tarjeta.valor}`),
      secciones: vista.secciones,
      archivo: `reporte-${consulta.tipo}`,
    }, guardar);
  }

  private construir(datos: DatosReporte): VistaReporte {
    switch (datos.reporte) {
      case 'ingresos': return this.ingresos(datos);
      case 'ocupacion': return this.ocupacion(datos);
      case 'reservas': return this.reservas(datos);
      case 'tours': return this.tours(datos);
    }
  }

  private ingresos(datos: ReporteIngresos): VistaReporte {
    const resumen = datos.resumen ?? [];
    const detalle = datos.detalle ?? [];
    const totalColones = sumar(resumen, (fila) => fila.total_crc);
    const pagos = sumar(resumen, (fila) => fila.cantidad);
    const enDolares = sumar(resumen.filter((fila) => fila.moneda === 'USD'), (fila) => fila.total_moneda);
    const monto = (valor: unknown, moneda: string) => moneda === 'USD' ? dolares(valor) : colones(valor);

    return {
      tarjetas: [
        { etiqueta: 'Total cobrado', valor: colones(totalColones), icono: 'savings' },
        { etiqueta: 'Pagos registrados', valor: cantidad(pagos), icono: 'receipt_long' },
        { etiqueta: 'Recibido en dólares', valor: dolares(enDolares), icono: 'attach_money' },
      ],
      secciones: [
        seccion('Resumen por método de pago', ['Método', 'Moneda', 'Pagos', 'Monto', 'En colones'],
          resumen.map((fila) => [
            METODOS[fila.metodo] ?? fila.metodo, fila.moneda === 'USD' ? 'Dólares' : 'Colones',
            cantidad(fila.cantidad), monto(fila.total_moneda, fila.moneda), colones(fila.total_crc)]),
          [2, 3, 4], ['Total', '', cantidad(pagos), '', colones(totalColones)]),
        seccion('Detalle de pagos', ['Fecha', 'Reserva', 'Cliente', 'Método', 'Monto', 'En colones'],
          detalle.map((fila) => [
            fechaHoraTexto(fila.pagado_at), fila.codigo_reserva ?? '', fila.cliente ?? '',
            METODOS[fila.metodo] ?? fila.metodo, monto(fila.monto, fila.moneda), colones(fila.monto_crc)]),
          [4, 5], ['Total', '', '', '', '', colones(sumar(detalle, (fila) => fila.monto_crc))]),
      ],
    };
  }

  private ocupacion(datos: ReporteOcupacion): VistaReporte {
    const tipos = datos.tipos ?? [];
    const ocupadas = sumar(tipos, (fila) => fila.noches_ocupadas);
    const disponibles = sumar(tipos, (fila) => fila.noches_disponibles);
    const ingreso = sumar(tipos, (fila) => fila.ingreso_estimado);
    const general = disponibles > 0 ? ocupadas * 100 / disponibles : 0;

    return {
      tarjetas: [
        { etiqueta: 'Ocupación general', valor: porcentaje(general), icono: 'donut_large' },
        { etiqueta: 'Noches ocupadas', valor: `${cantidad(ocupadas)} de ${cantidad(disponibles)}`, icono: 'nights_stay' },
        { etiqueta: 'Ingreso estimado por hospedaje', valor: colones(ingreso), icono: 'savings' },
      ],
      secciones: [
        seccion(`Ocupación por tipo de habitación (${cantidad(datos.noches_rango)} noches en el rango)`,
          ['Tipo', 'Habitaciones', 'Reservas', 'Noches ocupadas', 'Noches disponibles', 'Ocupación', 'Ingreso estimado'],
          tipos.map((fila) => [
            fila.nombre, cantidad(fila.habitaciones), cantidad(fila.reservas), cantidad(fila.noches_ocupadas),
            cantidad(fila.noches_disponibles), porcentaje(fila.porcentaje), colones(fila.ingreso_estimado)]),
          [1, 2, 3, 4, 5, 6],
          ['Total', cantidad(sumar(tipos, (fila) => fila.habitaciones)), cantidad(sumar(tipos, (fila) => fila.reservas)),
            cantidad(ocupadas), cantidad(disponibles), porcentaje(general), colones(ingreso)]),
      ],
    };
  }

  private reservas(datos: ReporteReservas): VistaReporte {
    const hospedaje = datos.hospedaje ?? [];
    const tours = datos.tours ?? [];
    const todas = [...hospedaje, ...tours];
    const columnas = ['Estado', 'Reservas', 'Total', 'Pagado', 'Saldo pendiente'];
    const filas = (lista: ReservasEstado[]) => lista.map((fila) => [
      ESTADOS[fila.estado] ?? fila.estado, cantidad(fila.cantidad), colones(fila.total), colones(fila.pagado), colones(fila.saldo)]);
    const pie = (lista: ReservasEstado[]) => ['Total', cantidad(sumar(lista, (fila) => fila.cantidad)),
      colones(sumar(lista, (fila) => fila.total)), colones(sumar(lista, (fila) => fila.pagado)), colones(sumar(lista, (fila) => fila.saldo))];

    return {
      tarjetas: [
        { etiqueta: 'Reservas en el período', valor: cantidad(sumar(todas, (fila) => fila.cantidad)), icono: 'event_available' },
        { etiqueta: 'Saldo pendiente', valor: colones(sumar(todas, (fila) => fila.saldo)), icono: 'pending_actions' },
        { etiqueta: 'Canceladas', icono: 'event_busy',
          valor: cantidad(sumar(todas.filter((fila) => fila.estado === 'CANCELADA'), (fila) => fila.cantidad)) },
      ],
      secciones: [
        seccion('Reservas de hospedaje', columnas, filas(hospedaje), [1, 2, 3, 4], pie(hospedaje)),
        seccion('Reservas de tours', columnas, filas(tours), [1, 2, 3, 4], pie(tours)),
      ],
    };
  }

  private tours(datos: ReporteTours): VistaReporte {
    const tours = datos.tours ?? [];
    const guias = datos.guias ?? [];
    const personas = sumar(tours, (fila) => fila.personas);
    const cupo = sumar(tours, (fila) => fila.cupo);
    const vendido = sumar(tours, (fila) => fila.vendido);

    return {
      tarjetas: [
        { etiqueta: 'Personas en tours', valor: cantidad(personas), icono: 'groups' },
        { etiqueta: 'Salidas realizadas o programadas', valor: cantidad(sumar(tours, (fila) => fila.salidas)), icono: 'event' },
        { etiqueta: 'Total vendido', valor: colones(vendido), icono: 'savings' },
      ],
      secciones: [
        seccion('Tours más vendidos', ['Tour', 'Salidas', 'Cupo', 'Personas', 'Ocupación', 'Vendido'],
          tours.map((fila) => [
            fila.nombre, cantidad(fila.salidas), cantidad(fila.cupo), cantidad(fila.personas),
            porcentaje(fila.ocupacion), colones(fila.vendido)]),
          [1, 2, 3, 4, 5],
          ['Total', cantidad(sumar(tours, (fila) => fila.salidas)), cantidad(cupo), cantidad(personas),
            porcentaje(cupo > 0 ? personas * 100 / cupo : 0), colones(vendido)]),
        seccion('Salidas por guía', ['Guía', 'Salidas', 'Personas', 'Vendido'],
          guias.map((fila) => [fila.nombre, cantidad(fila.salidas), cantidad(fila.personas), colones(fila.vendido)]),
          [1, 2, 3]),
      ],
    };
  }
}
