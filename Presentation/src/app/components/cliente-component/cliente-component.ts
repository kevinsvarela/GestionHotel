import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { form, FormField } from '@angular/forms/signals';
import { ClienteService } from '../../shared/services/cliente-service';
import { AuthService } from '../../shared/services/auth-service';
import { ClienteInput, ClienteModel } from '../../shared/models/cliente-model';
import { Roles } from '../../shared/models/roles';
import { FrmCliente } from '../forms/frm-cliente/frm-cliente';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

type FilterForm = {
  identificacion: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
};

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatExpansionModule, MatFormFieldModule, MatInputModule, MatPaginatorModule, FormField],
  selector: 'app-cliente-component',
  styleUrl: './cliente-component.css',
  templateUrl: './cliente-component.html',
})
export class ClienteComponent implements OnInit {
  displayedColumns: string[] = ['id', 'identificacion', 'nombre', 'email', 'telefono', 'botonera'];
  dataSource = signal<ClienteModel[]>([]);
  total = signal(0);

  srvCliente = inject(ClienteService);
  private readonly srvAuth = inject(AuthService);
  dialog = inject(MatDialog);

  esAdmin = computed(() => Number(this.srvAuth.userActualS().rol_id) === Roles.Admin);

  buscarID = signal<number | null>(null);
  private accion: 'editar' | 'info' = 'editar';

  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ identificacion: '', nombre: '', apellidos: '', email: '', telefono: '' });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const respuesta = this.srvCliente.clientes.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvCliente.clientePorId;
      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const cliente = respuesta.value()?.data ?? undefined;
        this.buscarID.set(null);
        this.srvCliente.buscarPorId(null);
        if (this.accion === 'info') {
          this.mostrarDialogo('Información del cliente', cliente, true);
        } else {
          this.mostrarDialogo('Editar cliente', cliente, false, id);
        }
      } else if (respuesta.status() === 'error') {
        this.buscarID.set(null);
        this.srvCliente.buscarPorId(null);
        this.alertar('error', 'No se pudo cargar el cliente');
      }
    });
  }

  private filtrarClientes(): void {
    const filtro = this.objFilter();
    this.srvCliente.filtrar({
      identificacion: filtro.identificacion.trim(),
      nombre: filtro.nombre.trim(),
      apellidos: filtro.apellidos.trim(),
      email: filtro.email.trim(),
      telefono: filtro.telefono.trim(),
    });
  }

  private resetearFiltro(): void {
    this.objFilter.set({ identificacion: '', nombre: '', apellidos: '', email: '', telefono: '' });
    this.filtrarClientes();
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

  public mostrarDialogo(titulo: string, datos?: ClienteModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmCliente, unknown, ClienteInput | false | undefined>(FrmCliente, {
      width: '50vw',
      maxWidth: '35rem',
      data: { title: titulo, data: datos, info: info },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((cliente) => {
      if (cliente === undefined || cliente === false) {
        return;
      }

      this.srvCliente.guardar(cliente, id).subscribe({
        complete: () => {
          this.srvCliente.clientes.reload();
          this.alertar('check', id === undefined ? 'Cliente registrado' : 'Cliente actualizado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo guardar el cliente'));
        },
      });
    });
  }

  onCreate(): void {
    this.mostrarDialogo('Nuevo cliente');
  }

  onEdit(id: number): void {
    this.accion = 'editar';
    this.buscarID.set(id);
    this.srvCliente.buscarPorId(id);
  }

  onInfo(id: number): void {
    this.accion = 'info';
    this.buscarID.set(id);
    this.srvCliente.buscarPorId(id);
  }

  onDelete(cliente: ClienteModel): void {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '22rem',
      data: {
        icono: 'warning',
        texto: `¿Desea eliminar al cliente ${cliente.nombre} ${cliente.apellidos}?`,
        textoAceptar: ' Eliminar ',
        textoCancelar: ' Cancelar ',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (confirmado !== true) {
        return;
      }
      this.srvCliente.eliminar(cliente.id!).subscribe({
        complete: () => {
          this.srvCliente.clientes.reload();
          this.alertar('check', 'Cliente eliminado');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo eliminar el cliente'));
        },
      });
    });
  }

  onPage(evento: PageEvent): void {
    this.srvCliente.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
  }

  onFilterChange(): void {
    this.filtrarClientes();
  }

  onFilterClose(): void {
    this.resetearFiltro();
    this.panelFilterState.set(false);
  }

  toggleFilterPanel(): void {
    this.panelFilterState.update((abierto) => !abierto);
  }

  ngOnInit(): void {
    this.resetearFiltro();
  }
}
