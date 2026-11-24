import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { form, FormField } from '@angular/forms/signals';
import { HabitacionService } from '../../shared/services/habitacion-service';
import { TipoHabitacionService } from '../../shared/services/tipo-habitacion-service';
import { AuthService } from '../../shared/services/auth-service';
import { HabitacionCreateInput, HabitacionModel } from '../../shared/models/habitacion-model';
import { Roles } from '../../shared/models/roles';
import { FrmHabitacion } from '../forms/frm-habitacion/frm-habitacion';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  numero: string;
  piso: string;
  estado: string;
  tipo_habitacion_id: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule,
    FormField],
  selector: 'app-habitacion-component',
  styleUrl: './habitacion-component.css',
  templateUrl: './habitacion-component.html',
})
export class HabitacionComponent implements OnInit {
  displayedColumns: string[] = ['id', 'numero', 'tipo_habitacion_nombre', 'piso', 'estado', 'botonera'];
  dataSource = signal<HabitacionModel[]>([]);
  total = signal(0);

  srvHabitacion = inject(HabitacionService);
  srvTipo = inject(TipoHabitacionService);
  private readonly srvAuth = inject(AuthService);
  dialog = inject(MatDialog);

  //Solo el administrador puede crear, modificar o eliminar habitaciones (igual que en la API)
  esAdmin = computed(() => Number(this.srvAuth.userActualS().rol_id) === Roles.Admin);

  //Id que se está buscando y para qué (editar o ver información)
  buscarID = signal<number | null>(null);
  private accion: 'editar' | 'info' = 'editar';

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ numero: '', piso: '', estado: '', tipo_habitacion_id: '' });
  frmFilter = form(this.objFilter);

  readonly estados = [
    { valor: 'DISPONIBLE', texto: 'Disponible' },
    { valor: 'MANTENIMIENTO', texto: 'Mantenimiento' },
    { valor: 'FUERA_SERVICIO', texto: 'Fuera de servicio' },
  ];

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.filtrarHabitaciones(filtro));
    });

    effect(() => {
      const respuesta = this.srvHabitacion.habitaciones.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvHabitacion.habitacionPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const habitacion = respuesta.value()?.data ?? undefined;
        //Se limpia la búsqueda para que el diálogo no se vuelva a abrir solo
        this.buscarID.set(null);
        this.srvHabitacion.buscarPorId(null);
        if (this.accion === 'info') {
          this.mostrarDialogo('Información de la habitación', habitacion, true);
        } else {
          this.mostrarDialogo('Editar habitación', habitacion, false, id);
        }
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvHabitacion.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar la habitación');
      }
    });
  }

  private filtrarHabitaciones(filtro: FilterForm): void {
    this.srvHabitacion.filtrar({
      numero: filtro.numero.trim().toUpperCase(),
      piso: filtro.piso,
      estado: filtro.estado,
      tipo_habitacion_id: filtro.tipo_habitacion_id,
    });
  }

  private resetearFiltro(): void {
    this.objFilter.set({ numero: '', piso: '', estado: '', tipo_habitacion_id: '' });
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

  public mostrarDialogo(titulo: string, datos?: HabitacionModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmHabitacion, unknown, HabitacionCreateInput | false | undefined>(FrmHabitacion, {
      width: '92vw',
      maxWidth: '36rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { title: titulo, data: datos, info: info },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((habitacion) => {
      if (habitacion === undefined || habitacion === false) {
        return;
      }

      this.srvHabitacion.guardar(habitacion, id).subscribe({
        complete: () => {
          this.srvHabitacion.habitaciones.reload();
          this.alertar('check', id === undefined ? 'Habitación creada' : 'Habitación actualizada');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar la habitación'));
        },
      });
    });
  } //Fin de mostrarDialogo

  onCreate(): void {
    this.mostrarDialogo('Nueva habitación');
  }

  onEdit(id: number): void {
    this.accion = 'editar';
    this.buscarID.set(id);
    this.srvHabitacion.buscarPorId(id);
  }

  onInfo(id: number): void {
    this.accion = 'info';
    this.buscarID.set(id);
    this.srvHabitacion.buscarPorId(id);
  }

  onDelete(habitacion: HabitacionModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '22rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar la habitación ${habitacion.numero}?`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvHabitacion.eliminar(habitacion.id!).subscribe({
        complete: () => {
          this.srvHabitacion.habitaciones.reload();
          this.alertar('check', 'Habitación eliminada');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar la habitación'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvHabitacion.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
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

  //Colores de la etiqueta de estado (verde, amarillo o rojo)
  claseEstado(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'estado-verde';
      case 'MANTENIMIENTO': return 'estado-amarillo';
      default: return 'estado-rojo';
    }
  }

  textoEstado(estado: string): string {
    return this.estados.find((e) => e.valor === estado)?.texto ?? estado;
  }

  ngOnInit(): void {
    this.srvTipo.tipos.reload();
    this.resetearFiltro();
  }
}
