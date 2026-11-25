import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { disabled, form, FormField, FormRoot, pattern, required, RootFieldContext, validate } from '@angular/forms/signals';
import { MetodoPago, MonedaPago, PagoInput, TipoReservaPago } from '../../../shared/models/pago-model';
import { ReservaHabitacionService } from '../../../shared/services/reserva-habitacion-service';
import { ReservaTourService } from '../../../shared/services/reserva-tour-service';

interface PagoDialogData {
  tipo?: TipoReservaPago;
  reservaId?: number;
}

type ErrorCampo = { kind: string; message: string } | null;

type PagoForm = {
  reserva_id: number;
  monto: number;
  moneda: MonedaPago;
  metodo: MetodoPago;
  referencia: string;
};

interface ReservaOpcion {
  id: number;
  codigo: string;
  cliente: string;
  detalle: string;
  total: number;
  pagado: number;
  saldo: number;
}

function ahora(): string {
  const fecha = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField, CurrencyPipe],
  selector: 'app-frm-pago',
  styleUrl: './frm-pago.css',
  templateUrl: './frm-pago.html',
})
export class FrmPago implements OnInit {
  readonly dialogRef = inject(MatDialogRef<FrmPago, PagoInput | false | undefined>);
  private readonly data = inject<PagoDialogData>(MAT_DIALOG_DATA);
  private readonly srvReservaHabitacion = inject(ReservaHabitacionService);
  private readonly srvReservaTour = inject(ReservaTourService);
  readonly reservaFija = this.data.reservaId !== undefined;

  tipo = signal<TipoReservaPago>(this.data.tipo ?? 'HABITACION');

  readonly metodos: { valor: MetodoPago; texto: string; icono: string }[] = [
    { valor: 'EFECTIVO', texto: 'Efectivo', icono: 'payments' },
    { valor: 'TARJETA', texto: 'Tarjeta', icono: 'credit_card' },
    { valor: 'SINPE', texto: 'SINPE Móvil', icono: 'phone_iphone' },
  ];

  objPago = signal<PagoForm>({
    reserva_id: this.data.reservaId ?? 0,
    monto: 0,
    moneda: 'CRC',
    metodo: 'EFECTIVO',
    referencia: '',
  });

  readonly reservas = computed<ReservaOpcion[]>(() => {
    if (this.tipo() === 'HABITACION') {
      return (this.srvReservaHabitacion.todas.value()?.data ?? [])
        .filter((reserva) => reserva.estado !== 'CANCELADA')
        .map((reserva) => this.opcion(reserva.id!, reserva.codigo ?? '', `${reserva.cliente_nombre} ${reserva.cliente_apellidos}`,
          `Hab. ${reserva.habitacion_numero}`, Number(reserva.total ?? 0), Number(reserva.pagado ?? 0)));
    }
    return (this.srvReservaTour.todas.value()?.data ?? [])
      .filter((reserva) => reserva.estado !== 'CANCELADA')
      .map((reserva) => this.opcion(reserva.id!, reserva.codigo ?? '', `${reserva.cliente_nombre} ${reserva.cliente_apellidos}`,
        reserva.tour_nombre ?? '', Number(reserva.total ?? 0), Number(reserva.pagado ?? 0)));
  });

  readonly reservaSeleccionada = computed(() => {
    const id = Number(this.objPago().reserva_id);
    return this.reservas().find((reserva) => reserva.id === id);
  });

  frmPago = form(this.objPago, (s) => {
    disabled(s.reserva_id, () => this.reservaFija);

    validate(s.reserva_id, (context: RootFieldContext<number>): ErrorCampo => {
      return Number(context.value()) >= 1 ? null : { kind: 'reserva', message: 'Seleccione la reserva' };
    });

    required(s.monto, { message: 'El monto es requerido' });
    validate(s.monto, ({ value, valueOf }): ErrorCampo => {
      const monto = Number(value());
      if (isNaN(monto) || monto <= 0) {
        return { kind: 'monto', message: 'El monto debe ser mayor a 0' };
      }
      if (!/^\d+(\.\d{1,2})?$/.test(String(value()))) {
        return { kind: 'decimales', message: 'El monto puede tener máximo 2 decimales' };
      }
      const saldo = this.reservaSeleccionada()?.saldo;
      return valueOf(s.moneda) === 'CRC' && saldo !== undefined && monto > saldo
        ? { kind: 'saldo', message: 'El monto supera el saldo pendiente de la reserva' }
        : null;
    });

    required(s.moneda, { message: 'La moneda es requerida' });
    required(s.metodo, { message: 'El método de pago es requerido' });

    required(s.referencia, {
      message: 'El número de comprobante es requerido para tarjeta y SINPE',
      when: ({ valueOf }) => valueOf(s.metodo) !== 'EFECTIVO',
    });
    pattern(s.referencia, /^[A-Za-z0-9-]{3,50}$/, {
      message: 'Entre 3 y 50 letras, números o guiones',
      when: (context) => context.value() !== '',
    });
  }, {
    submission: {
      action: async () => {
        const pago = this.objPago();
        const esHabitacion = this.tipo() === 'HABITACION';
        this.dialogRef.close({
          reserva_habitacion_id: esHabitacion ? Number(pago.reserva_id) : null,
          reserva_tour_id: esHabitacion ? null : Number(pago.reserva_id),
          monto: Number(pago.monto),
          moneda: pago.moneda,
          metodo: pago.metodo,
          referencia: pago.referencia.trim().toUpperCase(),
          pagado_at: ahora(),
        });
      }
    }
  });

  private opcion(id: number, codigo: string, cliente: string, detalle: string, total: number, pagado: number): ReservaOpcion {
    return { id: Number(id), codigo, cliente, detalle, total, pagado, saldo: Math.max(total - pagado, 0) };
  }

  cambiarTipo(tipo: TipoReservaPago): void {
    this.tipo.set(tipo);
    this.objPago.update((actual) => ({ ...actual, reserva_id: 0, monto: 0 }));
  }

  onReservaChange(): void {
    const reserva = this.reservaSeleccionada();
    if (reserva && this.objPago().moneda === 'CRC') {
      this.objPago.update((actual) => ({ ...actual, monto: reserva.saldo }));
    }
  }

  ngOnInit(): void {
    this.srvReservaHabitacion.todas.reload();
    this.srvReservaTour.todas.reload();
  }

  constructor() {
    let montoInicial = false;
    effect(() => {
      const reserva = this.reservaSeleccionada();
      if (this.reservaFija && reserva && !montoInicial) {
        montoInicial = true;
        untracked(() => this.objPago.update((actual) => ({ ...actual, monto: reserva.saldo })));
      }
    });
  }
}
