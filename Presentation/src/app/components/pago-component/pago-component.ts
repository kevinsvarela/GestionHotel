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
import { PagoService } from '../../shared/services/pago-service';
import { AuthService } from '../../shared/services/auth-service';
import { Roles } from '../../shared/models/roles';
import { PagoInput, PagoModel } from '../../shared/models/pago-model';
import { FrmPago } from '../forms/frm-pago/frm-pago';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';
import { FrmAnularPago } from '../forms/frm-anular-pago/frm-anular-pago';

type FilterForm = {
  codigo: string;
  cliente: string;
  metodo: string;
  fecha: string;
  estado: string;
};

@Component({
  imports: [MatTooltipModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, FormField, DatePipe, CurrencyPipe],
  selector: 'app-pago-component',
  styleUrl: './pago-component.css',
  templateUrl: './pago-component.html',
})
export class PagoComponent implements OnInit {
  displayedColumns: string[] = ['fecha', 'reserva', 'cliente', 'metodo', 'monto', 'registrado', 'botonera'];
  dataSource = signal<PagoModel[]>([]);
  total = signal(0);

  srvPago = inject(PagoService);
  private readonly srvAuth = inject(AuthService);
  dialog = inject(MatDialog);

  esAdmin = computed(() => Number(this.srvAuth.userActualS().rol_id) === Roles.Admin);

  readonly metodos = [
    { valor: 'EFECTIVO', texto: 'Efectivo', icono: 'payments' },
    { valor: 'TARJETA', texto: 'Tarjeta', icono: 'credit_card' },
    { valor: 'SINPE', texto: 'SINPE Móvil', icono: 'phone_iphone' },
  ];

  private readonly filtroVacio: FilterForm = { codigo: '', cliente: '', metodo: '', fecha: '', estado: '' };
  panelFilterState = signal(false);
  objFilter = signal<FilterForm>({ ...this.filtroVacio });
  frmFilter = form(this.objFilter);

  constructor() {
    effect(() => {
      const filtro = this.objFilter();
      untracked(() => this.srvPago.filtrar({
        codigo: filtro.codigo.trim().toUpperCase(),
        cliente: filtro.cliente.trim(),
        metodo: filtro.metodo,
        fecha: filtro.fecha,
        estado: filtro.estado,
      }));
    });

    effect(() => {
      const respuesta = this.srvPago.pagos.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
        this.total.set(respuesta.pagination?.total ?? respuesta.data.length);
      }
    });
  }

  aFecha(valor: string): Date {
    return new Date(valor.replace(' ', 'T'));
  }

  metodo(valor: string) {
    return this.metodos.find((m) => m.valor === valor) ?? { valor, texto: valor, icono: 'payments' };
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

  onCreate(): void {
    this.dialog.open<FrmPago, unknown, PagoInput[] | false | undefined>(FrmPago, {
      width: '92vw',
      maxWidth: '42rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: {},
      disableClose: true,
    }).afterClosed().subscribe((pagos) => {
      if (pagos === undefined || pagos === false || pagos.length === 0) {
        return;
      }
      forkJoin(pagos.map((pago) => this.srvPago.registrar(pago))).subscribe({
        complete: () => {
          this.srvPago.pagos.reload();
          this.alertar('check', pagos.length === 1 ? 'Pago registrado' : `Pago registrado para ${pagos.length} reservas`);
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo registrar el pago'));
        },
      });
    });
  }

  onAnular(pago: PagoModel): void {
    this.dialog.open<FrmAnularPago, PagoModel, string | false | undefined>(FrmAnularPago, {
      width: '92vw',
      maxWidth: '32rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: pago,
    }).afterClosed().subscribe((motivo) => {
      if (motivo === undefined || motivo === false) {
        return;
      }
      this.srvPago.anular(pago.id!, motivo).subscribe({
        complete: () => {
          this.srvPago.pagos.reload();
          this.alertar('check', 'Pago anulado. El monto vuelve a quedar pendiente en la reserva.');
        },
        error: (error: HttpErrorResponse) => {
          this.alertar('error', this.mensajeError(error, 'No se pudo anular el pago'));
        },
      });
    });
  }

  detalleAnulacion(pago: PagoModel): string {
    const cuando = pago.anulado_at ? this.aFecha(pago.anulado_at).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return `Anulado por ${pago.anulado_por_nombre ?? 'usuario'} el ${cuando}. Motivo: ${pago.motivo_anulacion ?? ''}`;
  }

  onPage(evento: PageEvent): void {
    this.srvPago.cambiarPagina(evento.pageIndex * evento.pageSize, evento.pageSize);
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
