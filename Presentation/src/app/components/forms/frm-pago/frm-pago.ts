import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { form, FormField, FormRoot, pattern, required, validate } from '@angular/forms/signals';
import { MetodoPago, MonedaPago, PagoInput, TipoReservaPago } from '../../../shared/models/pago-model';
import { ClienteModel } from '../../../shared/models/cliente-model';
import { ReservaHabitacionModel } from '../../../shared/models/reserva-habitacion-model';
import { ReservaTourModel } from '../../../shared/models/reserva-tour-model';
import { ClienteService } from '../../../shared/services/cliente-service';
import { TipoCambioService } from '../../../shared/services/tipo-cambio-service';
import { environment } from '../../../../environments/environment';

const _SERVIDOR = environment.servidor;

interface PagoDialogData {
  tipo?: TipoReservaPago;
  reservaId?: number;
  clienteId?: number;
}

type ErrorCampo = { kind: string; message: string } | null;

type PagoForm = {
  monto: number;
  moneda: MonedaPago;
  metodo: MetodoPago;
  referencia: string;
};

interface ReservaPendiente {
  clave: string;
  tipo: TipoReservaPago;
  id: number;
  codigo: string;
  detalle: string;
  fechas: string;
  total: number;
  pagado: number;
  saldo: number;
}

function ahora(): string {
  const fecha = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/-/g, '').toLowerCase().trim();
}

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatAutocompleteModule, MatCheckboxModule, FormRoot, FormField, CurrencyPipe],
  selector: 'app-frm-pago',
  styleUrl: './frm-pago.css',
  templateUrl: './frm-pago.html',
})
export class FrmPago implements OnInit {
  readonly dialogRef = inject(MatDialogRef<FrmPago, PagoInput[] | false | undefined>);
  private readonly data = inject<PagoDialogData>(MAT_DIALOG_DATA);
  readonly srvCliente = inject(ClienteService);
  readonly srvTipoCambio = inject(TipoCambioService);

  readonly metodos: { valor: MetodoPago; texto: string }[] = [
    { valor: 'EFECTIVO', texto: 'Efectivo' },
    { valor: 'TARJETA', texto: 'Tarjeta' },
    { valor: 'SINPE', texto: 'SINPE Móvil' },
  ];

  busqueda = signal('');
  cliente = signal<ClienteModel | null>(null);
  seleccionadas = signal<Set<string>>(new Set());

  readonly clientesEncontrados = computed(() => {
    const texto = normalizar(this.busqueda());
    if (texto.length < 2) {
      return [];
    }
    return (this.srvCliente.todos.value()?.data ?? [])
      .filter((cliente) => normalizar(`${cliente.nombre} ${cliente.apellidos}`).includes(texto)
        || normalizar(cliente.identificacion).includes(texto))
      .slice(0, 8);
  });

  private readonly reservasHabitacion = httpResource<{ data: ReservaHabitacionModel[] }>(() => {
    const cliente = this.cliente();
    return cliente ? { url: `${_SERVIDOR}/reservas-habitacion/filter/0/100`, params: { cliente_id: Number(cliente.id) } } : undefined;
  });

  private readonly reservasTour = httpResource<{ data: ReservaTourModel[] }>(() => {
    const cliente = this.cliente();
    return cliente ? { url: `${_SERVIDOR}/reservas-tour/filter/0/100`, params: { cliente_id: Number(cliente.id) } } : undefined;
  });

  readonly cargandoReservas = computed(() => this.reservasHabitacion.isLoading() || this.reservasTour.isLoading());

  readonly pendientes = computed<ReservaPendiente[]>(() => {
    const habitaciones = (this.reservasHabitacion.value()?.data ?? []).map((reserva) => this.pendiente(
      'HABITACION', reserva.id!, reserva.codigo ?? '', `Habitación ${reserva.habitacion_numero} · ${reserva.tipo_habitacion_nombre ?? ''}`,
      `${reserva.fecha_entrada.substring(0, 10)} → ${reserva.fecha_salida.substring(0, 10)}`,
      reserva.estado, reserva.total, reserva.pagado));
    const tours = (this.reservasTour.value()?.data ?? []).map((reserva) => this.pendiente(
      'TOUR', reserva.id!, reserva.codigo ?? '', `${reserva.tour_nombre ?? ''} · ${reserva.personas} pers.`,
      (reserva.fecha_hora_inicio ?? '').substring(0, 16),
      reserva.estado, reserva.total, reserva.pagado));
    return [...habitaciones, ...tours].filter((reserva): reserva is ReservaPendiente => reserva !== null);
  });

  readonly elegidas = computed(() => this.pendientes().filter((reserva) => this.seleccionadas().has(reserva.clave)));

  readonly saldoElegido = computed(() => this.elegidas().reduce((suma, reserva) => suma + reserva.saldo, 0));

  readonly variasReservas = computed(() => this.elegidas().length > 1);

  objPago = signal<PagoForm>({
    monto: 0,
    moneda: 'CRC',
    metodo: 'EFECTIVO',
    referencia: '',
  });

  readonly moneda = computed(() => this.objPago().moneda);

  readonly tipoCambio = computed(() => Number(this.srvTipoCambio.hoy.value()?.data?.aplicado ?? 0));

  readonly saldoAPagar = computed(() => {
    const moneda = this.moneda();
    const total = this.elegidas().reduce((suma, reserva) => suma + this.saldoEnMoneda(reserva, moneda), 0);
    return Math.round(total * 100) / 100;
  });

  readonly equivalenteColones = computed(() =>
    Math.min(Math.round(Number(this.objPago().monto || 0) * this.tipoCambio() * 100) / 100, this.saldoElegido()));

  frmPago = form(this.objPago, (s) => {
    required(s.monto, { message: 'El monto es requerido' });
    validate(s.monto, ({ value }): ErrorCampo => {
      const monto = Number(value());
      if (isNaN(monto) || monto <= 0) {
        return { kind: 'monto', message: 'El monto debe ser mayor a 0' };
      }
      if (!/^\d+(\.\d{1,2})?$/.test(String(value()))) {
        return { kind: 'decimales', message: 'El monto puede tener máximo 2 decimales' };
      }
      return monto > this.saldoAPagar()
        ? { kind: 'saldo', message: 'El monto supera el saldo pendiente' }
        : null;
    });

    validate(s.moneda, ({ value }): ErrorCampo => {
      return value() === 'USD' && this.tipoCambio() <= 0
        ? { kind: 'usd', message: 'No se pudo obtener el tipo de cambio del día' }
        : null;
    });

    required(s.metodo, { message: 'El método de pago es requerido' });

    required(s.referencia, {
      message: 'El número de comprobante es requerido para tarjeta y SINPE',
      when: ({ valueOf }) => valueOf(s.metodo) !== 'EFECTIVO',
    });
    pattern(s.referencia, /^[A-Za-z0-9-]{3,30}$/, {
      message: 'Entre 3 y 30 letras, números o guiones',
      when: (context) => context.value() !== '',
    });
  }, {
    submission: {
      action: async () => {
        const elegidas = this.elegidas();
        if (elegidas.length === 0) {
          return;
        }
        const pago = this.objPago();
        const referencia = pago.referencia.trim().toUpperCase();
        const fecha = ahora();
        const montos = this.repartir(Number(pago.monto), elegidas, pago.moneda);
        this.dialogRef.close(elegidas.map((reserva, indice) => ({
          reserva_habitacion_id: reserva.tipo === 'HABITACION' ? reserva.id : null,
          reserva_tour_id: reserva.tipo === 'TOUR' ? reserva.id : null,
          monto: montos[indice],
          moneda: pago.moneda,
          metodo: pago.metodo,
          referencia: referencia !== '' && elegidas.length > 1 ? `${referencia}-${reserva.codigo}` : referencia,
          pagado_at: fecha,
        })).filter((detalle) => detalle.monto > 0));
      }
    }
  });

  constructor() {
    effect(() => {
      const saldo = this.saldoAPagar();
      untracked(() => this.objPago.update((actual) => ({ ...actual, monto: saldo })));
    });

    effect(() => {
      const pendientes = this.pendientes();
      const reservaId = this.data.reservaId;
      if (reservaId === undefined || pendientes.length === 0) {
        return;
      }
      const clave = `${this.data.tipo ?? 'HABITACION'}-${reservaId}`;
      untracked(() => {
        if (this.seleccionadas().size === 0 && pendientes.some((reserva) => reserva.clave === clave)) {
          this.seleccionadas.set(new Set([clave]));
        }
      });
    });

    effect(() => {
      const clienteId = this.data.clienteId;
      const clientes = this.srvCliente.todos.value()?.data ?? [];
      if (clienteId === undefined || untracked(() => this.cliente()) !== null) {
        return;
      }
      const cliente = clientes.find((opcion) => Number(opcion.id) === Number(clienteId));
      if (cliente) {
        untracked(() => this.elegirCliente(cliente));
      }
    });
  }

  private pendiente(tipo: TipoReservaPago, id: number, codigo: string, detalle: string, fechas: string,
                    estado: string, total: unknown, pagado: unknown): ReservaPendiente | null {
    const saldo = Math.max(Number(total ?? 0) - Number(pagado ?? 0), 0);
    if (estado === 'CANCELADA' || saldo <= 0) {
      return null;
    }
    return { clave: `${tipo}-${id}`, tipo, id: Number(id), codigo, detalle, fechas,
      total: Number(total ?? 0), pagado: Number(pagado ?? 0), saldo };
  }

  saldoEnMoneda(reserva: ReservaPendiente, moneda: MonedaPago): number {
    const tipoCambio = this.tipoCambio();
    if (moneda === 'CRC' || tipoCambio <= 0) {
      return reserva.saldo;
    }
    return Math.ceil(Math.round(reserva.saldo / tipoCambio * 10000) / 100) / 100;
  }

  private repartir(monto: number, elegidas: ReservaPendiente[], moneda: MonedaPago): number[] {
    if (elegidas.length === 1) {
      return [monto];
    }
    let restante = monto;
    return elegidas.map((reserva) => {
      const parte = Math.min(this.saldoEnMoneda(reserva, moneda), Math.round(restante * 100) / 100);
      restante -= parte;
      return parte;
    });
  }

  nombreCliente(cliente: ClienteModel | null): string {
    return cliente ? `${cliente.nombre} ${cliente.apellidos}` : '';
  }

  buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
    if (this.cliente() !== null) {
      this.cliente.set(null);
      this.seleccionadas.set(new Set());
    }
  }

  elegirCliente(cliente: ClienteModel): void {
    this.cliente.set(cliente);
    this.busqueda.set(this.nombreCliente(cliente));
    this.seleccionadas.set(new Set());
  }

  onClienteSeleccionado(evento: MatAutocompleteSelectedEvent): void {
    this.elegirCliente(evento.option.value as ClienteModel);
  }

  cambiarCliente(): void {
    this.cliente.set(null);
    this.busqueda.set('');
    this.seleccionadas.set(new Set());
  }

  alternar(clave: string, marcada: boolean): void {
    this.seleccionadas.update((actual) => {
      const nueva = new Set(actual);
      if (marcada) {
        nueva.add(clave);
      } else {
        nueva.delete(clave);
      }
      return nueva;
    });
  }

  alternarTodas(marcada: boolean): void {
    this.seleccionadas.set(marcada ? new Set(this.pendientes().map((reserva) => reserva.clave)) : new Set());
  }

  ngOnInit(): void {
    this.srvCliente.todos.reload();
    this.srvTipoCambio.hoy.reload();
  }
}
