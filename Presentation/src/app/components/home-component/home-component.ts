import { Component, computed, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardService } from '../../shared/services/dashboard-service';
import { PagoService } from '../../shared/services/pago-service';
import { AuthService } from '../../shared/services/auth-service';
import { MovimientoHabitacion, ReservaPorCobrar, TourDelDia } from '../../shared/models/dashboard-model';
import { PagoInput } from '../../shared/models/pago-model';
import { FrmPago } from '../forms/frm-pago/frm-pago';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';

interface Barra {
  etiqueta: string;
  detalle: string;
  valor: number;
  altura: number;
  hoy: boolean;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function aFecha(valor: string): Date {
  return new Date(valor.length === 10 ? `${valor}T00:00:00` : valor.replace(' ', 'T'));
}

@Component({
  imports: [RouterModule, MatIconModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, MatTooltipModule,
    CurrencyPipe, DatePipe, DecimalPipe],
  selector: 'app-home-component',
  styleUrl: './home-component.css',
  templateUrl: './home-component.html',
})
export class HomeComponent implements OnInit {
  readonly srvDashboard = inject(DashboardService);
  private readonly srvPago = inject(PagoService);
  private readonly srvAuth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly datos = computed(() => this.srvDashboard.resumen.value()?.data);

  readonly saludo = computed(() => {
    const hora = new Date().getHours();
    const texto = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const usuario = this.srvAuth.userActualS().username;
    return usuario ? `${texto}, ${usuario}` : texto;
  });

  readonly iconoSaludo = computed(() => {
    const hora = new Date().getHours();
    return hora >= 5 && hora < 18 ? 'wb_sunny' : 'nights_stay';
  });

  readonly hoy = computed(() => this.datos() ? aFecha(this.datos()!.fecha) : new Date());

  readonly fechaLarga = computed(() =>
    this.hoy().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

  readonly mes = computed(() => this.hoy().toLocaleDateString('es-CR', { month: 'long' }));

  readonly habitacionesOperables = computed(() => {
    const habitaciones = this.datos()?.habitaciones;
    return habitaciones ? habitaciones.disponibles : 0;
  });

  readonly ocupacion = computed(() => {
    const operables = this.habitacionesOperables();
    return operables > 0 ? Math.round((this.datos()!.en_casa.reservas * 100) / operables) : 0;
  });

  readonly saldoTotal = computed(() => {
    const saldo = this.datos()?.saldo_pendiente;
    return saldo ? Number(saldo.hospedaje.saldo) + Number(saldo.tours.saldo) : 0;
  });

  readonly barrasOcupacion = computed<Barra[]>(() => {
    const operables = this.habitacionesOperables();
    return (this.datos()?.ocupacion_semana ?? []).map((dia, indice) => {
      const porcentaje = operables > 0 ? Math.round((dia.ocupadas * 100) / operables) : 0;
      return {
        etiqueta: indice === 0 ? 'Hoy' : DIAS[aFecha(dia.fecha).getDay()],
        detalle: `${dia.ocupadas} de ${operables} habitaciones`,
        valor: porcentaje,
        altura: Math.min(porcentaje, 100),
        hoy: indice === 0,
      };
    });
  });

  readonly barrasCobros = computed<Barra[]>(() => {
    const dias = this.datos()?.cobros_semana ?? [];
    const maximo = Math.max(...dias.map((dia) => Number(dia.total)), 1);
    return dias.map((dia, indice) => ({
      etiqueta: indice === dias.length - 1 ? 'Hoy' : DIAS[aFecha(dia.fecha).getDay()],
      detalle: aFecha(dia.fecha).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }),
      valor: Number(dia.total),
      altura: Math.round((Number(dia.total) * 100) / maximo),
      hoy: indice === dias.length - 1,
    }));
  });

  saldo(reserva: MovimientoHabitacion | ReservaPorCobrar): number {
    return Math.max(Number(reserva.total) - Number(reserva.pagado), 0);
  }

  cupoUsado(tour: TourDelDia): number {
    return tour.cupo > 0 ? Math.min(Math.round((Number(tour.reservados) * 100) / tour.cupo), 100) : 0;
  }

  hora(valor: string): Date {
    return aFecha(valor);
  }

  diaCorto(valor: string): string {
    return aFecha(valor).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric' });
  }

  estadoLlegada(reserva: MovimientoHabitacion): { texto: string; clase: string } {
    if (reserva.estado === 'EN_CURSO') {
      return { texto: 'Ingresó', clase: 'estado-verde' };
    }
    return reserva.estado === 'CONFIRMADA'
      ? { texto: 'Confirmada', clase: 'estado-turquesa' }
      : { texto: 'Pendiente', clase: 'estado-amarillo' };
  }

  estadoSalida(reserva: MovimientoHabitacion): { texto: string; clase: string } {
    return reserva.estado === 'FINALIZADA'
      ? { texto: 'Salió', clase: 'estado-gris' }
      : { texto: 'Por salir', clase: 'estado-amarillo' };
  }

  estadoTour(tour: TourDelDia): { texto: string; clase: string } {
    switch (tour.estado) {
      case 'EN_CURSO': return { texto: 'En curso', clase: 'estado-turquesa' };
      case 'FINALIZADO': return { texto: 'Finalizado', clase: 'estado-gris' };
      default: return { texto: 'Programado', clase: 'estado-verde' };
    }
  }

  actualizar(): void {
    this.srvDashboard.resumen.reload();
  }

  onPagar(reserva: ReservaPorCobrar): void {
    this.dialog.open<FrmPago, unknown, PagoInput[] | false | undefined>(FrmPago, {
      width: '92vw',
      maxWidth: '42rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: { tipo: 'HABITACION', reservaId: reserva.id, clienteId: reserva.cliente_id },
      disableClose: true,
    }).afterClosed().subscribe((pagos) => {
      if (pagos === undefined || pagos === false || pagos.length === 0) {
        return;
      }
      forkJoin(pagos.map((pago) => this.srvPago.registrar(pago))).subscribe({
        complete: () => {
          this.actualizar();
          this.alertar('check', pagos.length === 1 ? 'Pago registrado' : `Pago registrado para ${pagos.length} reservas`);
        },
        error: (error: HttpErrorResponse) => {
          const mensaje = typeof error.error?.error === 'string' ? error.error.error : 'No se pudo registrar el pago';
          this.alertar('error', mensaje);
        },
      });
    });
  }

  private alertar(icono: string, mensaje: string) {
    return this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: { icono: icono, texto: mensaje, textoAceptar: ' Aceptar ' },
    });
  }

  ngOnInit(): void {
    this.srvDashboard.resumen.reload();
  }
}
