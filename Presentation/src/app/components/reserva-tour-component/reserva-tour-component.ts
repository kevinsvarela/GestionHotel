import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { ReservaTourService } from '../../shared/services/reserva-tour-service';
import { AuthService } from '../../shared/services/auth-service';
import { Roles } from '../../shared/models/roles';
import { ReservaTourInput, ReservaTourModel } from '../../shared/models/reserva-tour-model';
import { FrmReservaTour } from '../forms/frm-reserva-tour/frm-reserva-tour';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  codigo: string;
  cliente: string;
  tour: string;
  fecha: string;
  estado: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, FormField, DatePipe, CurrencyPipe],
  selector: 'app-reserva-tour-component',
  styleUrl: './reserva-tour-component.css',
  templateUrl: './reserva-tour-component.html',
})
export class ReservaTourComponent implements OnInit {
  displayedColumns: string[] = ['codigo', 'cliente', 'tour', 'personas', 'total', 'estado', 'botonera'];
  dataSource = signal<ReservaTourModel[]>([]);
  total = signal(0);

  srvReserva = inject(ReservaTourService);
  private readonly srvAuth = inject(AuthService);
  dialog = inject(MatDialog);

  esAdmin = computed(() => Number(this.srvAuth.userActualS().rol_id) === Roles.Admin);

  readonly estados = [
    { valor: 'PENDIENTE', texto: 'Pendiente', clase: 'estado-amarillo' },
    { valor: 'CONFIRMADA', texto: 'Confirmada', clase: 'estado-turquesa' },
    { valor: 'FINALIZADA', texto: 'Finalizada', clase: 'estado-verde' },
    { valor: 'CANCELADA', texto: 'Cancelada', clase: 'estado-rojo' },
  ];

  private readonly filtroVacio: FilterForm = { codigo: '', cliente: '', tour: '', fecha: '', estado: '' };
  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ ...this.filtroVacio });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.srvReserva.filtrar({
        codigo: filtro.codigo.trim().toUpperCase(),
        cliente: filtro.cliente.trim(),
        tour: filtro.tour.trim(),
        fecha: filtro.fecha,
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
  }

  aFecha(valor: string | undefined): Date | null {
    return valor ? new Date(valor.replace(' ', 'T')) : null;
  }

  estado(valor: string) {
    return this.estados.find((e) => e.valor === valor) ?? { valor, texto: valor, clase: 'estado-gris' };
  }

  editable(reserva: ReservaTourModel): boolean {
    return (reserva.estado === 'PENDIENTE' || reserva.estado === 'CONFIRMADA') && reserva.salida_estado === 'PROGRAMADO';
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

  public mostrarDialogo(titulo: string, datos?: ReservaTourModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmReservaTour, unknown, ReservaTourInput | false | undefined>(FrmReservaTour, {
      width: '92vw',
      maxWidth: '38rem',
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

  private actualizarEstado(reserva: ReservaTourModel, cambios: Partial<ReservaTourModel>, mensaje: string): void {
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
    this.mostrarDialogo('Nueva reserva de tour');
  }

  onEdit(reserva: ReservaTourModel): void {
    this.mostrarDialogo('Editar reserva de tour', reserva, false, reserva.id);
  }

  onInfo(reserva: ReservaTourModel): void {
    this.mostrarDialogo('Información de la reserva', reserva, true);
  }

  onConfirmar(reserva: ReservaTourModel): void {
    this.actualizarEstado(reserva, { estado: 'CONFIRMADA' }, 'Reserva confirmada');
  }

  onCancelar(reserva: ReservaTourModel): void {
    this.confirmar('event_busy', `¿Cancelar la reserva ${reserva.codigo}?\nLos espacios quedan libres para otros clientes.`, ' Cancelar reserva ')
      .subscribe((confirmado) => {
        if (confirmado === true) {
          this.actualizarEstado(reserva, { estado: 'CANCELADA' }, 'Reserva cancelada');
        }
      });
  }

  onDelete(reserva: ReservaTourModel): void {
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
      this.objFilter.set({ ...this.filtroVacio });
      this.panelFilterState.set(false);
    } else {
      this.panelFilterState.set(true);
    }
  }

  ngOnInit(): void {
    this.objFilter.set({ ...this.filtroVacio });
  }
}
