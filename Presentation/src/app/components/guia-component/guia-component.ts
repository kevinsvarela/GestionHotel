import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
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
import { GuiaService } from '../../shared/services/guia-service';
import { IdiomaService } from '../../shared/services/idioma-service';
import { GuiaConIdiomas, GuiaModel } from '../../shared/models/guia-model';
import { FrmGuia } from '../forms/frm-guia/frm-guia';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  nombre: string;
  telefono: string;
  idioma_id: string;
  activo: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, FormField],
  selector: 'app-guia-component',
  styleUrl: './guia-component.css',
  templateUrl: './guia-component.html',
})
export class GuiaComponent implements OnInit {
  displayedColumns: string[] = ['nombre', 'telefono', 'idiomas', 'activo', 'botonera'];
  dataSource = signal<GuiaModel[]>([]);
  total = signal(0);

  srvGuia = inject(GuiaService);
  readonly srvIdioma = inject(IdiomaService);
  dialog = inject(MatDialog);

  buscarID = signal<number | null>(null);
  private accion: 'editar' | 'info' = 'editar';

  private readonly nombresIdioma = computed(() => {
    const nombres = new Map<number, string>();
    for (const idioma of this.srvIdioma.idiomas.value()?.data ?? []) {
      nombres.set(Number(idioma.id), idioma.nombre);
    }
    return nombres;
  });

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ nombre: '', telefono: '', idioma_id: '', activo: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.srvGuia.filtrar({
        nombre: filtro.nombre.trim(),
        telefono: filtro.telefono.trim(),
        idioma_id: filtro.idioma_id,
        activo: filtro.activo,
      }));
    });

    effect(() => {
      const respuesta = this.srvGuia.guiasFiltrados.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvGuia.guiaPorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const guia = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvGuia.buscarPorId(null);
        if (this.accion === 'info') {
          this.mostrarDialogo('Información del guía', guia, true);
        } else {
          this.mostrarDialogo('Editar guía', guia, false, id);
        }
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvGuia.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar el guía');
      }
    });
  }

  idiomasDe(guia: GuiaModel): string[] {
    const nombres = this.nombresIdioma();
    return this.srvGuia.idiomasDe(Number(guia.id))
      .map((id) => nombres.get(id) ?? '')
      .filter((nombre) => nombre !== '');
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

  public mostrarDialogo(titulo: string, datos?: GuiaModel, info?: boolean, id?: number) {
    const idiomas = datos?.id !== undefined ? this.srvGuia.idiomasDe(Number(datos.id)) : [];
    const dialogRef = this.dialog.open<FrmGuia, unknown, GuiaConIdiomas | false | undefined>(FrmGuia, {
      width: '92vw',
      maxWidth: '34rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { title: titulo, data: datos, idiomas: idiomas, info: info },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((guia) => {
      if (guia === undefined || guia === false) {
        return;
      }

      this.srvGuia.guardar(guia, id).subscribe({
        complete: () => {
          this.srvGuia.recargar();
          this.alertar('check', id === undefined ? 'Guía registrado' : 'Guía actualizado');
        },
        error: (error: HttpErrorResponse) => {
          this.srvGuia.recargar();
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar el guía'));
        },
      });
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Nuevo guía');
  }

  onEdit(id: number): void {
    this.accion = 'editar';
    this.buscarID.set(id);
    this.srvGuia.buscarPorId(id);
  }

  onInfo(id: number): void {
    this.accion = 'info';
    this.buscarID.set(id);
    this.srvGuia.buscarPorId(id);
  }

  onDelete(guia: GuiaModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar al guía ${guia.nombre}?\nSi tiene salidas asignadas no se podrá eliminar; en ese caso póngalo como Inactivo.`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvGuia.eliminar(guia.id!).subscribe({
        complete: () => {
          this.srvGuia.recargar();
          this.alertar('check', 'Guía eliminado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar el guía'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvGuia.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
  }

  toggleFilterPanel(): void {
    if (this.panelFilterState()) {
      this.objFilter.set({ nombre: '', telefono: '', idioma_id: '', activo: '' });
      this.panelFilterState.set(false);
    } else {
      this.panelFilterState.set(true);
    }
  }

  ngOnInit(): void {
    this.objFilter.set({ nombre: '', telefono: '', idioma_id: '', activo: '' });
  }
}
