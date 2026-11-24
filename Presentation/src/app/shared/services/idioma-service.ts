import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { IdiomaModel } from '../models/idioma-model';
import { environment } from '../../../environments/environment';

type ParametrosIdioma = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaIdiomasFiltrados {
  data: IdiomaModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

@Injectable({ providedIn: 'root' })
export class IdiomaService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosIdioma | null>(null);
  private readonly idiomaId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(10);

  readonly idiomas = httpResource<{ data: IdiomaModel[] }>(() => `${_SERVIDOR}/idiomas`);

  readonly idiomasFiltrados = httpResource<RespuestaIdiomasFiltrados>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/idiomas/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly idiomaPorId = httpResource<{ data: IdiomaModel | null }>(() => {
    const id = this.idiomaId();
    return id === null ? undefined : `${_SERVIDOR}/idiomas/${id}`;
  });

  filtrar(parametros: ParametrosIdioma): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.idiomaId.set(id);
  }

  recargar(): void {
    this.idiomasFiltrados.reload();
    this.idiomas.reload();
  }

  guardar(datos: Omit<IdiomaModel, 'id'>, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/idiomas/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/idiomas`, datos);
    }
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/idiomas/${id}`);
  }
}
