import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
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
import { TourProgramadoService } from '../../shared/services/tour-programado-service';
import { GuiaService } from '../../shared/services/guia-service';
import { TourProgramadoInput, TourProgramadoModel } from '../../shared/models/tour-programado-model';
import { FrmTourProgramado } from '../forms/frm-tour-programado/frm-tour-programado';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  tour: string;
  fecha: string;
  guia_id: string;
  estado: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, FormField, DatePipe],
  selector: 'app-tour-programado-component',
  styleUrl: './tour-programado-component.css',
  templateUrl: './tour-programado-component.html',
})
export class TourProgramadoComponent implements OnInit {
  displayedColumns: string[] = ['fecha', 'tour_nombre', 'guia_nombre', 'cupo', 'estado', 'botonera'];
  dataSource = signal<TourProgramadoModel[]>([]);
  total = signal(0);

  srvProgramado = inject(TourProgramadoService);
  srvGuia = inject(GuiaService);
  dialog = inject(MatDialog);

  buscarID = signal<number | null>(null);
  private accion: 'editar' | 'info' = 'editar';

  readonly estados = [
    { valor: 'PROGRAMADO', texto: 'Programado', clase: 'estado-turquesa' },
    { valor: 'EN_CURSO', texto: 'En curso', clase: 'estado-amarillo' },
    { valor: 'FINALIZADO', texto: 'Finalizado', clase: 'estado-verde' },
    { valor: 'CANCELADO', texto: 'Cancelado', clase: 'estado-rojo' },
  ];

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ tour: '', fecha: '', guia_id: '', estado: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.srvProgramado.filtrar({
        tour: filtro.tour.trim(),
        fecha: filtro.fecha,
        guia_id: filtro.guia_id,
        estado: filtro.estado,
      }));
    });

    effect(() => {
      const respuesta = this.srvProgramado.programados.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvProgramado.programadoPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const programado = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvProgramado.buscarPorId(null);
        if (this.accion === 'info') {
          this.mostrarDialogo('Información de la salida', programado, true);
        } else {
          this.mostrarDialogo('Editar salida', programado, false, id);
        }
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvProgramado.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar el tour programado');
      }
    });
  }

  aFecha(valor: string): Date {
    return new Date(valor.replace(' ', 'T'));
  }

  estado(valor: string) {
    return this.estados.find((e) => e.valor === valor) ?? { valor, texto: valor, clase: 'estado-gris' };
  }

  private alertar(icono: string, mensaje: string) {
    return this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: { icono: icono, texto: mensaje, textoAceptar: ' Aceptar ' },
    });
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

  public mostrarDialogo(titulo: string, datos?: TourProgramadoModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmTourProgramado, unknown, TourProgramadoInput | false | undefined>(FrmTourProgramado, {
      width: '92vw',
      maxWidth: '38rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { title: titulo, data: datos, info: info },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((programado) => {
      if (programado === undefined || programado === false) {
        return;
      }

      this.srvProgramado.guardar(programado, id).subscribe({
        complete: () => {
          this.srvProgramado.programados.reload();
          this.alertar('check', id === undefined ? 'Salida programada' : 'Salida actualizada');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar la salida'));
        },
      });
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Programar salida');
  }

  onEdit(id: number): void {
    this.accion = 'editar';
    this.buscarID.set(id);
    this.srvProgramado.buscarPorId(id);
  }

  onInfo(id: number): void {
    this.accion = 'info';
    this.buscarID.set(id);
    this.srvProgramado.buscarPorId(id);
  }

  onDelete(programado: TourProgramadoModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar la salida de ${programado.tour_nombre}?\nSi ya tiene reservas no se podrá eliminar; en ese caso cámbiela a Cancelado.`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvProgramado.eliminar(programado.id!).subscribe({
        complete: () => {
          this.srvProgramado.programados.reload();
          this.alertar('check', 'Salida eliminada');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar la salida'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvProgramado.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
  }

  toggleFilterPanel(): void {
    if (this.panelFilterState()) {
      this.objFilter.set({ tour: '', fecha: '', guia_id: '', estado: '' });
      this.panelFilterState.set(false);
    } else {
      this.panelFilterState.set(true);
    }
  }

  ngOnInit(): void {
    this.srvGuia.guias.reload();
    this.objFilter.set({ tour: '', fecha: '', guia_id: '', estado: '' });
  }
}
