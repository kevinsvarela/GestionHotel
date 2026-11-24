import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { TourInput, TourModel } from '../models/tour-model';
import { environment } from '../../../environments/environment';

type ParametrosTour = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaTours {
  data: TourModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaTour {
  data: TourModel | null;
}

@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosTour | null>(null);
  private readonly tourId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(5);

  readonly tours = httpResource<RespuestaTours>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/tours/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly todos = httpResource<{ data: TourModel[] }>(() => `${_SERVIDOR}/tours`);

  readonly tourPorId = httpResource<RespuestaTour>(() => {
    const id = this.tourId();
    return id === null ? undefined : `${_SERVIDOR}/tours/${id}`;
  });

  filtrar(parametros: ParametrosTour): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.tourId.set(id);
  }

  guardar(datos: TourInput, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/tours/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/tours`, datos);
    }
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/tours/${id}`);
  }
}
