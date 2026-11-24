import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { GuiaConIdiomas, GuiaModel } from '../models/guia-model';
import { IdiomaGuiaModel } from '../models/idioma-model';
import { environment } from '../../../environments/environment';

type ParametrosGuia = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaGuias {
  data: GuiaModel[];
}

interface RespuestaGuiasFiltrados {
  data: GuiaModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaGuia {
  data: GuiaModel | null;
}

@Injectable({ providedIn: 'root' })
export class GuiaService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosGuia | null>(null);
  private readonly guiaId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(5);

  readonly guias = httpResource<RespuestaGuias>(() => `${_SERVIDOR}/guias`);

  readonly idiomasGuia = httpResource<{ data: IdiomaGuiaModel[] }>(() => `${_SERVIDOR}/idiomas-guia`);

  readonly guiasFiltrados = httpResource<RespuestaGuiasFiltrados>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/guias/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly guiaPorId = httpResource<RespuestaGuia>(() => {
    const id = this.guiaId();
    return id === null ? undefined : `${_SERVIDOR}/guias/${id}`;
  });

  filtrar(parametros: ParametrosGuia): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.guiaId.set(id);
  }

  idiomasDe(guiaId: number): number[] {
    return (this.idiomasGuia.value()?.data ?? [])
      .filter((par) => Number(par.guia_id) === guiaId)
      .map((par) => Number(par.idioma_id));
  }

  recargar(): void {
    this.guiasFiltrados.reload();
    this.guias.reload();
    this.idiomasGuia.reload();
  }

  guardar(datos: GuiaConIdiomas, id?: number): Observable<unknown> {
    const peticion = id !== undefined
      ? this.http.put<{ data: GuiaModel }>(`${_SERVIDOR}/guias/${id}`, datos.guia)
      : this.http.post<{ data: GuiaModel }>(`${_SERVIDOR}/guias`, datos.guia);

    return peticion.pipe(
      map((respuesta) => Number(id ?? respuesta.data.id)),
      switchMap((guiaId) => this.sincronizarIdiomas(guiaId, datos.idiomas))
    );
  }

  private sincronizarIdiomas(guiaId: number, idiomas: number[]): Observable<unknown> {
    const actuales = this.idiomasDe(guiaId);
    const agregar = idiomas.filter((idioma) => !actuales.includes(idioma));
    const quitar = actuales.filter((idioma) => !idiomas.includes(idioma));

    const peticiones = [
      ...agregar.map((idioma) => this.http.post(`${_SERVIDOR}/idiomas-guia`, { guia_id: guiaId, idioma_id: idioma })),
      ...quitar.map((idioma) => this.http.delete(`${_SERVIDOR}/idiomas-guia/${guiaId}/${idioma}`)),
    ];

    return peticiones.length > 0 ? forkJoin(peticiones) : of(null);
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/guias/${id}`);
  }
}
