import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { form, FormField } from '@angular/forms/signals';
import { ReservaHabitacionService } from '../../shared/services/reserva-habitacion-service';
import { AuthService } from '../../shared/services/auth-service';
import { Roles } from '../../shared/models/roles';
import { ReservaHabitacionInput, ReservaHabitacionModel } from '../../shared/models/reserva-habitacion-model';
import { FrmReserva } from '../forms/frm-reserva/frm-reserva';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';
import { FrmPago } from '../forms/frm-pago/frm-pago';
import { PagoService } from '../../shared/services/pago-service';
import { PagoInput } from '../../shared/models/pago-model';

type FilterForm = {
  codigo: string;
  cliente: string;
  fecha_entrada: string;
  estado: string;
};

function ahora(): string {
  const fecha = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, FormField, DatePipe, CurrencyPipe],
  selector: 'app-reserva-component',
  styleUrl: './reserva-component.css',
  templateUrl: './reserva-component.html',
})
export class ReservaComponent implements OnInit {
  displayedColumns: string[] = ['codigo', 'cliente', 'habitacion', 'estadia', 'huespedes', 'total', 'estado', 'botonera'];
  dataSource = signal<ReservaHabitacionModel[]>([]);
  total = signal(0);

  srvReserva = inject(ReservaHabitacionService);
  private readonly srvAuth = inject(AuthService);
  dialog = inject(MatDialog);
  private readonly srvPago = inject(PagoService);

  esAdmin = computed(() => Number(this.srvAuth.userActualS().rol_id) === Roles.Admin);

  buscarID = signal<number | null>(null);
  private accion: 'editar' | 'info' = 'editar';

  readonly estados = [
    { valor: 'PENDIENTE', texto: 'Pendiente', clase: 'estado-amarillo' },
    { valor: 'CONFIRMADA', texto: 'Confirmada', clase: 'estado-turquesa' },
    { valor: 'EN_CURSO', texto: 'Hospedado', clase: 'estado-verde' },
    { valor: 'FINALIZADA', texto: 'Finalizada', clase: 'estado-gris' },
    { valor: 'CANCELADA', texto: 'Cancelada', clase: 'estado-rojo' },
  ];

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ codigo: '', cliente: '', fecha_entrada: '', estado: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.srvReserva.filtrar({
        codigo: filtro.codigo.trim().toUpperCase(),
        cliente: filtro.cliente.trim(),
        fecha_entrada: filtro.fecha_entrada,
        estado: filtro.estado,
      }));
    });

    effect(() => {
      const respuesta = this.srvReserva.reservas.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvReserva.reservaPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const reserva = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvReserva.buscarPorId(null);
        if (this.accion === 'info') {
          this.mostrarDialogo('Información de la reserva', reserva, true);
        } else {
          this.mostrarDialogo('Editar reserva', reserva, false, id);
        }
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvReserva.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar la reserva');
      }
    });
  }

  aFecha(valor: string): Date {
    return new Date(`${valor.substring(0, 10)}T00:00:00`);
  }

  noches(reserva: ReservaHabitacionModel): number {
    return Math.round((this.aFecha(reserva.fecha_salida).getTime() - this.aFecha(reserva.fecha_entrada).getTime()) / 86400000);
  }

  estado(valor: string) {
    return this.estados.find((e) => e.valor === valor) ?? { valor, texto: valor, clase: 'estado-gris' };
  }

  puedeHacerCheckin(reserva: ReservaHabitacionModel): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return (reserva.estado === 'PENDIENTE' || reserva.estado === 'CONFIRMADA') && this.aFecha(reserva.fecha_entrada) <= hoy;
  }

  saldo(reserva: ReservaHabitacionModel): number {
    return Math.max(Number(reserva.total ?? 0) - Number(reserva.pagado ?? 0), 0);
  }

  onPagar(reserva: ReservaHabitacionModel): void {
    this.dialog.open<FrmPago, unknown, PagoInput[] | false | undefined>(FrmPago, {
      width: '92vw',
      maxWidth: '42rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { tipo: 'HABITACION', reservaId: reserva.id, clienteId: reserva.cliente_id },
      disableClose: true,
    }).afterClosed().subscribe((pagos) => {
      if (pagos === undefined || pagos === false || pagos.length === 0) {
        return;
      }
      forkJoin(pagos.map((pago) => this.srvPago.registrar(pago))).subscribe({
        complete: () => {
          this.srvReserva.reservas.reload();
          this.alertar('check', pagos.length === 1 ? 'Pago registrado' : `Pago registrado para ${pagos.length} reservas`);
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo registrar el pago'));
        },
      });
    });
  }

  private alertar(icono: string, mensaje: string) {
    return this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: { icono: icono, texto: mensaje, textoAceptar: ' Aceptar ' },
    });
  }

  private confirmar(icono: string, texto: string, textoAceptar: string) {
    return this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: { icono, texto, textoAceptar, textoCancelar: ' Volver ' },
    }).afterClosed();
  }

  private mensajeError(error: HttpErrorResponse, porDefecto: string): string {
    const payload: unknown = error.error;
    if (typeof payload === 'object' && payload !== null) {
      const respuesta = payload as Record<string, unknown>;
      if (typeof respuesta['error'] === 'string') {
        return respuesta['error'];
      }
      const errores = respuesta['errors'];
      if (typeof errores === 'object' && errores !== null) {
        const mensajes = Object.values(errores as Record<string, unknown>)
          .filter((mensaje): mensaje is string => typeof mensaje === 'string');
        if (mensajes.length > 0) {
          return mensajes.join('\n');
        }
      }
    }
    if (error.status === 403) {
      return 'No tiene permisos para realizar esta acción.';
    }
    return `${porDefecto} (HTTP ${error.status}).`;
  }

  public mostrarDialogo(titulo: string, datos?: ReservaHabitacionModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmReserva, unknown, ReservaHabitacionInput | false | undefined>(FrmReserva, {
      width: '92vw',
      maxWidth: '40rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { title: titulo, data: datos, info: info },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((reserva) => {
      if (reserva === undefined || reserva === false) {
        return;
      }

      this.srvReserva.guardar(reserva, id).subscribe({
        next: (respuesta) => {
          const codigo = respuesta?.data?.codigo;
          this.srvReserva.reservas.reload();
          this.alertar('check', id === undefined
            ? `Reserva registrada${codigo ? ' con el código ' + codigo : ''}`
            : 'Reserva actualizada');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar la reserva'));
        },
      });
    });
  }

  private actualizarEstado(reserva: ReservaHabitacionModel, cambios: Partial<ReservaHabitacionModel>, mensaje: string): void {
    this.srvReserva.cambiarEstado(reserva.id!, cambios).subscribe({
      complete: () => {
        this.srvReserva.reservas.reload();
        this.alertar('check', mensaje);
      },
      error: (error: HttpErrorResponse) => {
        this.alertar('error', this.mensajeError(error, 'No se pudo actualizar la reserva'));
      },
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Nueva reserva');
  }

  onEdit(id: number): void {
    this.accion = 'editar';
    this.buscarID.set(id);
    this.srvReserva.buscarPorId(id);
  }

  onInfo(id: number): void {
    this.accion = 'info';
    this.buscarID.set(id);
    this.srvReserva.buscarPorId(id);
  }

  onCheckin(reserva: ReservaHabitacionModel): void {
    this.confirmar('login', `¿Registrar la llegada de ${reserva.cliente_nombre} ${reserva.cliente_apellidos} a la habitación ${reserva.habitacion_numero}?`, ' Hacer check-in ')
      .subscribe((confirmado) => {
        if (confirmado === true) {
          this.actualizarEstado(reserva, { estado: 'EN_CURSO', checkin_at: ahora() }, 'Check-in registrado');
        }
      });
  }

  onCheckout(reserva: ReservaHabitacionModel): void {
    this.confirmar('logout', `¿Registrar la salida de ${reserva.cliente_nombre} ${reserva.cliente_apellidos} de la habitación ${reserva.habitacion_numero}?`, ' Hacer check-out ')
      .subscribe((confirmado) => {
        if (confirmado === true) {
          this.actualizarEstado(reserva, { estado: 'FINALIZADA', checkout_at: ahora() }, 'Check-out registrado');
        }
      });
  }

  onCancelar(reserva: ReservaHabitacionModel): void {
    this.confirmar('event_busy', `¿Cancelar la reserva ${reserva.codigo}?\nLa habitación queda libre para esas fechas.`, ' Cancelar reserva ')
      .subscribe((confirmado) => {
        if (confirmado === true) {
          this.actualizarEstado(reserva, { estado: 'CANCELADA' }, 'Reserva cancelada');
        }
      });
  }

  onDelete(reserva: ReservaHabitacionModel): void {
    this.confirmar('warning', `¿Eliminar la reserva ${reserva.codigo}?\nSi tiene pagos registrados no se podrá eliminar; en ese caso cancélela.`, ' Eliminar ')
      .subscribe((confirmado) => {
        if (confirmado !== true) {
          return;
        }
        this.srvReserva.eliminar(reserva.id!).subscribe({
          complete: () => {
            this.srvReserva.reservas.reload();
            this.alertar('check', 'Reserva eliminada');
          },
          error: (error: HttpErrorResponse) => {
            this.alertar('error', this.mensajeError(error, 'No se pudo eliminar la reserva'));
          },
        });
      });
  }

  onPage(evento: PageEvent): void {
    this.srvReserva.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
  }

  toggleFilterPanel(): void {
    if (this.panelFilterState()) {
      this.objFilter.set({ codigo: '', cliente: '', fecha_entrada: '', estado: '' });
      this.panelFilterState.set(false);
    } else {
      this.panelFilterState.set(true);
    }
  }

  ngOnInit(): void {
    this.objFilter.set({ codigo: '', cliente: '', fecha_entrada: '', estado: '' });
  }
}
