import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
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
import { TourService } from '../../shared/services/tour-service';
import { AuthService } from '../../shared/services/auth-service';
import { Roles } from '../../shared/models/roles';
import { TourInput, TourModel } from '../../shared/models/tour-model';
import { FrmTour } from '../forms/frm-tour/frm-tour';
import { DuracionPipe } from '../../shared/helpers/pipes/duracion-pipe';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  nombre: string;
  punto_encuentro: string;
  activo: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, FormField, CurrencyPipe, DuracionPipe],
  selector: 'app-tour-component',
  styleUrl: './tour-component.css',
  templateUrl: './tour-component.html',
})
export class TourComponent implements OnInit {
  displayedColumns: string[] = ['nombre', 'duracion_minutos', 'precio_persona', 'cupo_maximo', 'punto_encuentro', 'activo', 'botonera'];
  dataSource = signal<TourModel[]>([]);
  total = signal(0);

  srvTour = inject(TourService);
  private readonly srvAuth = inject(AuthService);
  dialog = inject(MatDialog);

  esAdmin = computed(() => Number(this.srvAuth.userActualS().rol_id) === Roles.Admin);

  buscarID = signal<number | null>(null);
  private accion: 'editar' | 'info' = 'editar';

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ nombre: '', punto_encuentro: '', activo: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.filtrarTours(filtro));
    });

    effect(() => {
      const respuesta = this.srvTour.tours.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvTour.tourPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const tour = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvTour.buscarPorId(null);
        if (this.accion === 'info') {
          this.mostrarDialogo('Información del tour', tour, true);
        } else {
          this.mostrarDialogo('Editar tour', tour, false, id);
        }
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvTour.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar el tour');
      }
    });
  }

  private filtrarTours(filtro: FilterForm): void {
    this.srvTour.filtrar({
      nombre: filtro.nombre.trim(),
      punto_encuentro: filtro.punto_encuentro.trim(),
      activo: filtro.activo,
    });
  }

  private resetearFiltro(): void {
    this.objFilter.set({ nombre: '', punto_encuentro: '', activo: '' });
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

  public mostrarDialogo(titulo: string, datos?: TourModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmTour, unknown, TourInput | false | undefined>(FrmTour, {
      width: '92vw',
      maxWidth: '40rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { title: titulo, data: datos, info: info },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((tour) => {
      if (tour === undefined || tour === false) {
        return;
      }

      this.srvTour.guardar(tour, id).subscribe({
        complete: () => {
          this.srvTour.tours.reload();
          this.alertar('check', id === undefined ? 'Tour creado' : 'Tour actualizado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar el tour'));
        },
      });
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Nuevo tour');
  }

  onEdit(id: number): void {
    this.accion = 'editar';
    this.buscarID.set(id);
    this.srvTour.buscarPorId(id);
  }

  onInfo(id: number): void {
    this.accion = 'info';
    this.buscarID.set(id);
    this.srvTour.buscarPorId(id);
  }

  onDelete(tour: TourModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '22rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar el tour ${tour.nombre}?`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvTour.eliminar(tour.id!).subscribe({
        complete: () => {
          this.srvTour.tours.reload();
          this.alertar('check', 'Tour eliminado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar el tour'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvTour.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
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
