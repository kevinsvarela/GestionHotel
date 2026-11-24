import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { ReservaHabitacionInput, ReservaHabitacionModel } from '../models/reserva-habitacion-model';
import { environment } from '../../../environments/environment';

type ParametrosReserva = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaReservas {
  data: ReservaHabitacionModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaReserva {
  data: ReservaHabitacionModel | null;
}

@Injectable({ providedIn: 'root' })
export class ReservaHabitacionService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosReserva | null>(null);
  private readonly reservaId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(10);

  readonly reservas = httpResource<RespuestaReservas>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/reservas-habitacion/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly reservaPorId = httpResource<RespuestaReserva>(() => {
    const id = this.reservaId();
    return id === null ? undefined : `${_SERVIDOR}/reservas-habitacion/${id}`;
  });

  filtrar(parametros: ParametrosReserva): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.reservaId.set(id);
  }

  guardar(datos: ReservaHabitacionInput, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/reservas-habitacion/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/reservas-habitacion`, datos);
    }
  }

  cambiarEstado(id: number, cambios: Partial<ReservaHabitacionModel>) {
    return this.http.put<any>(`${_SERVIDOR}/reservas-habitacion/${id}`, cambios);
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/reservas-habitacion/${id}`);
  }
}
