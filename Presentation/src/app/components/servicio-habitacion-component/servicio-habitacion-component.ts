import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { form, FormField } from '@angular/forms/signals';
import { ServicioHabitacionService } from '../../shared/services/servicio-habitacion-service';
import { ServicioHabitacionInput, ServicioHabitacionModel } from '../../shared/models/servicio-habitacion-model';
import { FrmServicioHabitacion } from '../forms/frm-servicio-habitacion/frm-servicio-habitacion';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  nombre: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule, FormField],
  selector: 'app-servicio-habitacion-component',
  styleUrl: './servicio-habitacion-component.css',
  templateUrl: './servicio-habitacion-component.html',
})
export class ServicioHabitacionComponent implements OnInit {
  displayedColumns: string[] = ['id', 'nombre', 'botonera'];
  dataSource = signal<ServicioHabitacionModel[]>([]);
  total = signal(0);

  srvServicio = inject(ServicioHabitacionService);
  dialog = inject(MatDialog);

  buscarID = signal<number | null>(null);

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ nombre: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.srvServicio.filtrar({ nombre: filtro.nombre.trim() }));
    });

    effect(() => {
      const respuesta = this.srvServicio.servicios.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvServicio.servicioPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const servicio = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvServicio.buscarPorId(null);
        this.mostrarDialogo('Editar servicio', servicio, id);
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvServicio.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar el servicio');
      }
    });
  }

  private alertar(icono: string, mensaje: string) {
    return this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '22rem',
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

  public mostrarDialogo(titulo: string, datos?: ServicioHabitacionModel, id?: number) {
    const dialogRef = this.dialog.open<FrmServicioHabitacion, unknown, ServicioHabitacionInput | false | undefined>(FrmServicioHabitacion, {
      width: '92vw',
      maxWidth: '30rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { title: titulo, data: datos },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((servicio) => {
      if (servicio === undefined || servicio === false) {
        return;
      }

      this.srvServicio.guardar(servicio, id).subscribe({
        complete: () => {
          this.srvServicio.servicios.reload();
          this.alertar('check', id === undefined ? 'Servicio creado' : 'Servicio actualizado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar el servicio'));
        },
      });
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Nuevo servicio');
  }

  onEdit(id: number): void {
    this.buscarID.set(id);
    this.srvServicio.buscarPorId(id);
  }

  onDelete(servicio: ServicioHabitacionModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar el servicio ${servicio.nombre}?\nTambién se quitará de los tipos de habitación que lo incluyen.`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvServicio.eliminar(servicio.id!).subscribe({
        complete: () => {
          this.srvServicio.servicios.reload();
          this.alertar('check', 'Servicio eliminado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar el servicio'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvServicio.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
  }

  toggleFilterPanel(): void {
    if (this.panelFilterState()) {
      this.objFilter.set({ nombre: '' });
      this.panelFilterState.set(false);
    } else {
      this.panelFilterState.set(true);
    }
  }

  ngOnInit(): void {
    this.objFilter.set({ nombre: '' });
  }
}
