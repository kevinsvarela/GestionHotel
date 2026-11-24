import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { HabitacionCreateInput, HabitacionModel } from '../models/habitacion-model';
import { environment } from '../../../environments/environment';

type ParametrosHabitacion = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaHabitaciones {
  data: HabitacionModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaHabitacion {
  data: HabitacionModel | null;
}

@Injectable({ providedIn: 'root' })
export class HabitacionService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosHabitacion | null>(null);
  private readonly habitacionId = signal<number | null>(null);
  //Paginación: offset = desde qué registro, limit = cuántos por página
  readonly offset = signal(0);
  readonly limit = signal(5);

  readonly habitaciones = httpResource<RespuestaHabitaciones>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/habitaciones/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly todas = httpResource<RespuestaHabitaciones>(() => `${_SERVIDOR}/habitaciones/filter/0/100`);

  readonly habitacionPorId = httpResource<RespuestaHabitacion>(() => {
    const id = this.habitacionId();
    return id === null ? undefined : `${_SERVIDOR}/habitaciones/${id}`;
  });

  filtrar(parametros: ParametrosHabitacion): void {
    //Al filtrar se vuelve a la primera página
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.habitacionId.set(id);
  }

  guardar(datos: HabitacionCreateInput, id?: number) {
    if (id !== undefined) { //Modificando la habitación
      return this.http.put<any>(`${_SERVIDOR}/habitaciones/${id}`, datos);
    } else { //Nueva habitación
      return this.http.post<any>(`${_SERVIDOR}/habitaciones`, datos);
    }
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/habitaciones/${id}`);
  }
}
