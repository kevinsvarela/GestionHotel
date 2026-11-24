import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { disabled, form, FormField, FormRoot, min, required, RootFieldContext, validate } from '@angular/forms/signals';
import { EstadoReservaTour, ReservaTourInput, ReservaTourModel } from '../../../shared/models/reserva-tour-model';
import { ClienteService } from '../../../shared/services/cliente-service';
import { TourProgramadoService } from '../../../shared/services/tour-programado-service';

interface ReservaTourDialogData {
  title: string;
  data?: ReservaTourModel;
  info?: boolean;
}

type ErrorCampo = { kind: string; message: string } | null;

interface SalidaOpcion {
  id: number;
  tour: string;
  fecha: Date;
  precio: number;
  libres: number;
}

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField, CurrencyPipe, DatePipe],
  selector: 'app-frm-reserva-tour',
  styleUrl: './frm-reserva-tour.css',
  templateUrl: './frm-reserva-tour.html',
})
export class FrmReservaTour implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmReservaTour, ReservaTourInput | false | undefined>);
  private readonly data = inject<ReservaTourDialogData>(MAT_DIALOG_DATA);
  readonly srvCliente = inject(ClienteService);
  private readonly srvProgramado = inject(TourProgramadoService);
  readonly soloLectura = this.data.info === true;
  readonly esNueva = this.data.data === undefined;
  readonly codigo = this.data.data?.codigo ?? '';

  readonly estados: { valor: EstadoReservaTour; texto: string }[] = [
    { valor: 'PENDIENTE', texto: 'Pendiente' },
    { valor: 'CONFIRMADA', texto: 'Confirmada' },
    { valor: 'FINALIZADA', texto: 'Finalizada' },
    { valor: 'CANCELADA', texto: 'Cancelada' },
  ];

  objReserva = signal<ReservaTourInput>({
    tour_programado_id: 0,
    cliente_id: 0,
    personas: 1,
    estado: 'CONFIRMADA',
  });

  readonly salidas = computed<SalidaOpcion[]>(() => {
    const actual = this.data.data;
    const opciones = (this.srvProgramado.disponibles.value()?.data ?? []).map((salida) => {
      let libres = Number(salida.cupo) - Number(salida.reservados ?? 0);
      if (actual && Number(actual.tour_programado_id) === Number(salida.id) && actual.estado !== 'CANCELADA') {
        libres += Number(actual.personas);
      }
      return {
        id: Number(salida.id),
        tour: salida.tour_nombre ?? '',
        fecha: new Date(salida.fecha_hora_inicio.replace(' ', 'T')),
        precio: Number(salida.precio_persona ?? 0),
        libres: libres,
      };
    });
    if (actual && !opciones.some((opcion) => opcion.id === Number(actual.tour_programado_id))) {
      opciones.unshift({
        id: Number(actual.tour_programado_id),
        tour: actual.tour_nombre ?? '',
        fecha: new Date((actual.fecha_hora_inicio ?? '').replace(' ', 'T')),
        precio: Number(actual.precio_persona ?? 0),
        libres: Number(actual.personas),
      });
    }
    return opciones;
  });

  readonly salidaSeleccionada = computed(() => {
    const id = Number(this.objReserva().tour_programado_id);
    return this.salidas().find((salida) => salida.id === id);
  });

  readonly totalEstimado = computed(() => {
    const salida = this.salidaSeleccionada();
    const personas = Number(this.objReserva().personas);
    if (!salida || !Number.isInteger(personas) || personas < 1) {
      return null;
    }
    const precio = !this.esNueva && salida.id === Number(this.data.data?.tour_programado_id)
      ? Number(this.data.data?.precio_persona ?? salida.precio)
      : salida.precio;
    return { personas, precio, total: personas * precio };
  });

  frmReserva = form(this.objReserva, (s) => {
    disabled(s, () => this.soloLectura);

    validate(s.cliente_id, (context: RootFieldContext<number>): ErrorCampo => {
      return Number(context.value()) >= 1 ? null : { kind: 'cliente', message: 'Seleccione el cliente' };
    });

    validate(s.tour_programado_id, (context: RootFieldContext<number>): ErrorCampo => {
      return Number(context.value()) >= 1 ? null : { kind: 'salida', message: 'Seleccione la salida del tour' };
    });

    required(s.personas, { message: 'La cantidad de personas es requerida' });
    min(s.personas, 1, { message: 'Debe haber al menos 1 persona' });
    validate(s.personas, (context: RootFieldContext<number>): ErrorCampo => {
      const personas = Number(context.value());
      if (!Number.isInteger(personas)) {
        return { kind: 'entero', message: 'Indique un número entero' };
      }
      const salida = this.salidaSeleccionada();
      return salida && personas > salida.libres
        ? { kind: 'cupo', message: `Solo quedan ${Math.max(salida.libres, 0)} espacios en esta salida` }
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
          tour_programado_id: Number(reserva.tour_programado_id),
          cliente_id: Number(reserva.cliente_id),
          personas: Number(reserva.personas),
          estado: reserva.estado,
        });
      }
    }
  });

  ngOnInit(): void {
    this.srvCliente.todos.reload();
    this.srvProgramado.disponibles.reload();
    this.titulo = this.data.title;
    const reserva = this.data.data;
    if (reserva) {
      this.objReserva.set({
        tour_programado_id: Number(reserva.tour_programado_id),
        cliente_id: Number(reserva.cliente_id),
        personas: Number(reserva.personas),
        estado: reserva.estado,
      });
    }
  }
}
