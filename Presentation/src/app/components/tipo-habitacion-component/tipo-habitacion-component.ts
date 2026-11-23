import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { form, FormField } from '@angular/forms/signals';
import { TipoHabitacionService } from '../../shared/services/tipo-habitacion-service';
import { TipoHabitacionInput, TipoHabitacionModel } from '../../shared/models/tipo-habitacion-model';
import { FrmTipoHabitacion } from '../forms/frm-tipo-habitacion/frm-tipo-habitacion';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  nombre: string;
  capacidad: string;
  activo: string;
};

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, FormField, CurrencyPipe],
  selector: 'app-tipo-habitacion-component',
  styleUrl: './tipo-habitacion-component.css',
  templateUrl: './tipo-habitacion-component.html',
})
export class TipoHabitacionComponent implements OnInit {
  displayedColumns: string[] = ['id', 'nombre', 'capacidad', 'precio_noche', 'activo', 'botonera'];
  dataSource = signal<TipoHabitacionModel[]>([]);
  total = signal(0);

  srvTipo = inject(TipoHabitacionService);
  dialog = inject(MatDialog);

  buscarID = signal<number | null>(null);
  private accion: 'editar' | 'info' = 'editar';

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ nombre: '', capacidad: '', activo: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const respuesta = this.srvTipo.tiposFiltrados.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvTipo.tipoPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const tipo = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvTipo.buscarPorId(null);
        if (this.accion === 'info') {
          this.mostrarDialogo('Información del tipo de habitación', tipo, true);
        } else {
          this.mostrarDialogo('Editar tipo de habitación', tipo, false, id);
        }
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvTipo.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar el tipo de habitación');
      }
    });
  }

  private filtrarTipos(): void {
    const filtro = this.objFilter();
    this.srvTipo.filtrar({
      nombre: filtro.nombre.trim(),
      capacidad: filtro.capacidad,
      activo: filtro.activo,
    });
  }

  private resetearFiltro(): void {
    this.objFilter.set({ nombre: '', capacidad: '', activo: '' });
    this.filtrarTipos();
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

  public mostrarDialogo(titulo: string, datos?: TipoHabitacionModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmTipoHabitacion, unknown, TipoHabitacionInput | false | undefined>(FrmTipoHabitacion, {
      width: '50vw',
      maxWidth: '35rem',
      data: { title: titulo, data: datos, info: info },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((tipo) => {
      if (tipo === undefined || tipo === false) {
        return;
      }

      this.srvTipo.guardar(tipo, id).subscribe({
        complete: () => {
          this.srvTipo.recargar();
          this.alertar('check', id === undefined ? 'Tipo de habitación creado' : 'Tipo de habitación actualizado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar el tipo de habitación'));
        },
      });
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Nuevo tipo de habitación');
  }

  onEdit(id: number): void {
    this.accion = 'editar';
    this.buscarID.set(id);
    this.srvTipo.buscarPorId(id);
  }

  onInfo(id: number): void {
    this.accion = 'info';
    this.buscarID.set(id);
    this.srvTipo.buscarPorId(id);
  }

  onDelete(tipo: TipoHabitacionModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '22rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar el tipo de habitación ${tipo.nombre}?`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvTipo.eliminar(tipo.id!).subscribe({
        complete: () => {
          this.srvTipo.recargar();
          this.alertar('check', 'Tipo de habitación eliminado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar el tipo de habitación'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvTipo.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
  }

  onFilterChange(): void {
    this.filtrarTipos();
  }

  onFilterClose(): void {
    this.resetearFiltro();
    this.panelFilterState.set(false);
  }

  toggleFilterPanel(): void {
    if (this.panelFilterState()) {
      this.onFilterClose();
    } else {
      this.panelFilterState.set(true);
    }
  }

  ngOnInit(): void {
    this.resetearFiltro();
  }
}
