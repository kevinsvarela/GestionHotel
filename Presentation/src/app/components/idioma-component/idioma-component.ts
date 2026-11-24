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
import { IdiomaService } from '../../shared/services/idioma-service';
import { IdiomaModel } from '../../shared/models/idioma-model';
import { FrmIdioma } from '../forms/frm-idioma/frm-idioma';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  nombre: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule, FormField],
  selector: 'app-idioma-component',
  styleUrl: './idioma-component.css',
  templateUrl: './idioma-component.html',
})
export class IdiomaComponent implements OnInit {
  displayedColumns: string[] = ['id', 'nombre', 'botonera'];
  dataSource = signal<IdiomaModel[]>([]);
  total = signal(0);

  srvIdioma = inject(IdiomaService);
  dialog = inject(MatDialog);

  buscarID = signal<number | null>(null);

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ nombre: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.srvIdioma.filtrar({ nombre: filtro.nombre.trim() }));
    });

    effect(() => {
      const respuesta = this.srvIdioma.idiomasFiltrados.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvIdioma.idiomaPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const idioma = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvIdioma.buscarPorId(null);
        this.mostrarDialogo('Editar idioma', idioma, id);
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvIdioma.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar el idioma');
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

  public mostrarDialogo(titulo: string, datos?: IdiomaModel, id?: number) {
    const dialogRef = this.dialog.open<FrmIdioma, unknown, Omit<IdiomaModel, 'id'> | false | undefined>(FrmIdioma, {
      width: '92vw',
      maxWidth: '30rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { title: titulo, data: datos },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((idioma) => {
      if (idioma === undefined || idioma === false) {
        return;
      }

      this.srvIdioma.guardar(idioma, id).subscribe({
        complete: () => {
          this.srvIdioma.recargar();
          this.alertar('check', id === undefined ? 'Idioma creado' : 'Idioma actualizado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar el idioma'));
        },
      });
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Nuevo idioma');
  }

  onEdit(id: number): void {
    this.buscarID.set(id);
    this.srvIdioma.buscarPorId(id);
  }

  onDelete(idioma: IdiomaModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar el idioma ${idioma.nombre}?\nTambién se quitará de los guías que lo hablan.`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvIdioma.eliminar(idioma.id!).subscribe({
        complete: () => {
          this.srvIdioma.recargar();
          this.alertar('check', 'Idioma eliminado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar el idioma'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvIdioma.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
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
