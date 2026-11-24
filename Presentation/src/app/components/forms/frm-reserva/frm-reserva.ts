import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { disabled, form, FormField, FormRoot, min, required, RootFieldContext, validate } from '@angular/forms/signals';
import {
  EstadoReservaHabitacion, ReservaHabitacionInput, ReservaHabitacionModel,
} from '../../../shared/models/reserva-habitacion-model';
import { ClienteService } from '../../../shared/services/cliente-service';
import { HabitacionService } from '../../../shared/services/habitacion-service';
import { TipoHabitacionService } from '../../../shared/services/tipo-habitacion-service';

interface ReservaDialogData {
  title: string;
  data?: ReservaHabitacionModel;
  info?: boolean;
}

type ErrorCampo = { kind: string; message: string } | null;

function hoy(): string {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function noches(entrada: string, salida: string): number {
  if (entrada === '' || salida === '') {
    return 0;
  }
  const diferencia = new Date(`${salida}T00:00:00`).getTime() - new Date(`${entrada}T00:00:00`).getTime();
  return Math.round(diferencia / 86400000);
}

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField, CurrencyPipe],
  selector: 'app-frm-reserva',
  styleUrl: './frm-reserva.css',
  templateUrl: './frm-reserva.html',
})
export class FrmReserva implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmReserva, ReservaHabitacionInput | false | undefined>);
  private readonly data = inject<ReservaDialogData>(MAT_DIALOG_DATA);
  readonly srvCliente = inject(ClienteService);
  private readonly srvHabitacion = inject(HabitacionService);
  private readonly srvTipo = inject(TipoHabitacionService);
  readonly soloLectura = this.data.info === true;
  readonly esNueva = this.data.data === undefined;
  readonly codigo = this.data.data?.codigo ?? '';

  readonly estados: { valor: EstadoReservaHabitacion; texto: string }[] = [
    { valor: 'PENDIENTE', texto: 'Pendiente' },
    { valor: 'CONFIRMADA', texto: 'Confirmada' },
    { valor: 'EN_CURSO', texto: 'En curso (hospedado)' },
    { valor: 'FINALIZADA', texto: 'Finalizada' },
    { valor: 'CANCELADA', texto: 'Cancelada' },
  ];

  objReserva = signal<ReservaHabitacionInput>({
    cliente_id: 0,
    habitacion_id: 0,
    fecha_entrada: hoy(),
    fecha_salida: '',
    huespedes: 1,
    estado: 'CONFIRMADA',
  });

  readonly habitaciones = computed(() => {
    const tipos = new Map((this.srvTipo.tipos.value()?.data ?? []).map((tipo) => [Number(tipo.id), tipo]));
    const actual = this.data.data?.habitacion_id;
    return (this.srvHabitacion.todas.value()?.data ?? [])
      .filter((habitacion) => habitacion.estado === 'DISPONIBLE' || habitacion.id === actual)
      .map((habitacion) => {
        const tipo = tipos.get(Number(habitacion.tipo_habitacion_id));
        return {
          id: Number(habitacion.id),
          numero: habitacion.numero,
          tipo: habitacion.tipo_habitacion_nombre ?? tipo?.nombre ?? '',
          capacidad: Number(tipo?.capacidad ?? 0),
          precio: Number(tipo?.precio_noche ?? 0),
        };
      });
  });

  readonly habitacionSeleccionada = computed(() => {
    const id = Number(this.objReserva().habitacion_id);
    return this.habitaciones().find((habitacion) => habitacion.id === id);
  });

  readonly cantidadNoches = computed(() => noches(this.objReserva().fecha_entrada, this.objReserva().fecha_salida));

  readonly totalEstimado = computed(() => {
    const habitacion = this.habitacionSeleccionada();
    const cantidad = this.cantidadNoches();
    if (!habitacion || cantidad <= 0) {
      return null;
    }
    const precio = !this.esNueva && habitacion.id === Number(this.data.data?.habitacion_id)
      ? Number(this.data.data?.precio_noche ?? habitacion.precio)
      : habitacion.precio;
    return { noches: cantidad, precio: precio, total: cantidad * precio };
  });

  frmReserva = form(this.objReserva, (s) => {
    disabled(s, () => this.soloLectura);

    validate(s.cliente_id, (context: RootFieldContext<number>): ErrorCampo => {
      return Number(context.value()) >= 1 ? null : { kind: 'cliente', message: 'Seleccione el cliente' };
    });

    validate(s.habitacion_id, (context: RootFieldContext<number>): ErrorCampo => {
      return Number(context.value()) >= 1 ? null : { kind: 'habitacion', message: 'Seleccione la habitación' };
    });

    required(s.fecha_entrada, { message: 'La fecha de entrada es requerida' });
    validate(s.fecha_entrada, (context: RootFieldContext<string>): ErrorCampo => {
      const entrada = context.value();
      return !this.esNueva || entrada === '' || entrada >= hoy()
        ? null
        : { kind: 'pasada', message: 'La fecha de entrada no puede ser anterior a hoy' };
    });

    required(s.fecha_salida, { message: 'La fecha de salida es requerida' });
    validate(s.fecha_salida, ({ value, valueOf }): ErrorCampo => {
      const entrada = valueOf(s.fecha_entrada);
      const salida = value();
      return entrada === '' || salida === '' || salida > entrada
        ? null
        : { kind: 'orden', message: 'La salida debe ser posterior a la entrada' };
    });

    required(s.huespedes, { message: 'La cantidad de huéspedes es requerida' });
    min(s.huespedes, 1, { message: 'Debe haber al menos 1 huésped' });
    validate(s.huespedes, (context: RootFieldContext<number>): ErrorCampo => {
      const cantidad = Number(context.value());
      if (!Number.isInteger(cantidad)) {
        return { kind: 'entero', message: 'Indique un número entero' };
      }
      const capacidad = this.habitacionSeleccionada()?.capacidad ?? 0;
      return capacidad > 0 && cantidad > capacidad
        ? { kind: 'capacidad', message: `La habitación admite máximo ${capacidad} huéspedes` }
        : null;
    });

    required(s.estado, { message: 'El estado es requerido' });
  }, {
    submission: {
      action: async () => {
        if (this.soloLectura) {
          return;
        }
        const reserva = this.objReserva();
        this.dialogRef.close({
          cliente_id: Number(reserva.cliente_id),
          habitacion_id: Number(reserva.habitacion_id),
          fecha_entrada: reserva.fecha_entrada,
          fecha_salida: reserva.fecha_salida,
          huespedes: Number(reserva.huespedes),
          estado: reserva.estado,
        });
      }
    }
  });

  ngOnInit(): void {
    this.srvCliente.todos.reload();
    this.srvHabitacion.todas.reload();
    this.srvTipo.tipos.reload();
    this.titulo = this.data.title;
    const reserva = this.data.data;
    if (reserva) {
      this.objReserva.set({
        cliente_id: Number(reserva.cliente_id),
        habitacion_id: Number(reserva.habitacion_id),
        fecha_entrada: reserva.fecha_entrada.substring(0, 10),
        fecha_salida: reserva.fecha_salida.substring(0, 10),
        huespedes: Number(reserva.huespedes),
        estado: reserva.estado,
      });
    }
  }
}
