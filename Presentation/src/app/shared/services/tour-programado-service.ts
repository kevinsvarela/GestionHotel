import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { TourProgramadoInput, TourProgramadoModel } from '../models/tour-programado-model';
import { environment } from '../../../environments/environment';

type ParametrosProgramado = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaProgramados {
  data: TourProgramadoModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaProgramado {
  data: TourProgramadoModel | null;
}

@Injectable({ providedIn: 'root' })
export class TourProgramadoService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosProgramado | null>(null);
  private readonly programadoId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(10);

  readonly programados = httpResource<RespuestaProgramados>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/tours-programados/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly programadoPorId = httpResource<RespuestaProgramado>(() => {
    const id = this.programadoId();
    return id === null ? undefined : `${_SERVIDOR}/tours-programados/${id}`;
  });

  filtrar(parametros: ParametrosProgramado): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.programadoId.set(id);
  }

  guardar(datos: TourProgramadoInput, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/tours-programados/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/tours-programados`, datos);
    }
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/tours-programados/${id}`);
  }
}
