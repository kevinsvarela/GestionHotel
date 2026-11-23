import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { TipoHabitacionInput, TipoHabitacionModel } from '../models/tipo-habitacion-model';
import { environment } from '../../../environments/environment';

type ParametrosTipo = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaTiposHabitacion {
  data: TipoHabitacionModel[];
}

interface RespuestaTiposFiltrados {
  data: TipoHabitacionModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaTipo {
  data: TipoHabitacionModel | null;
}

@Injectable({ providedIn: 'root' })
export class TipoHabitacionService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosTipo | null>(null);
  private readonly tipoId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(5);

  readonly tipos = httpResource<RespuestaTiposHabitacion>(() => `${_SERVIDOR}/tipos-habitacion`);

  readonly tiposFiltrados = httpResource<RespuestaTiposFiltrados>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/tipos-habitacion/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly tipoPorId = httpResource<RespuestaTipo>(() => {
    const id = this.tipoId();
    return id === null ? undefined : `${_SERVIDOR}/tipos-habitacion/${id}`;
  });

  filtrar(parametros: ParametrosTipo): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.tipoId.set(id);
  }

  recargar(): void {
    this.tiposFiltrados.reload();
    this.tipos.reload();
  }

  guardar(datos: TipoHabitacionInput, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/tipos-habitacion/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/tipos-habitacion`, datos);
    }
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/tipos-habitacion/${id}`);
  }
}
