import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { ReservaTourInput, ReservaTourModel } from '../models/reserva-tour-model';
import { environment } from '../../../environments/environment';

type ParametrosReserva = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaReservas {
  data: ReservaTourModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaReserva {
  data: ReservaTourModel | null;
}

@Injectable({ providedIn: 'root' })
export class ReservaTourService {
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
      url: `${_SERVIDOR}/reservas-tour/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly todas = httpResource<RespuestaReservas>(() => `${_SERVIDOR}/reservas-tour/filter/0/100`);

  readonly reservaPorId = httpResource<RespuestaReserva>(() => {
    const id = this.reservaId();
    return id === null ? undefined : `${_SERVIDOR}/reservas-tour/${id}`;
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

  guardar(datos: ReservaTourInput, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/reservas-tour/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/reservas-tour`, datos);
    }
  }

  cambiarEstado(id: number, cambios: Partial<ReservaTourModel>) {
    return this.http.put<any>(`${_SERVIDOR}/reservas-tour/${id}`, cambios);
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/reservas-tour/${id}`);
  }
}
