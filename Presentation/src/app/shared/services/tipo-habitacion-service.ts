import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { TipoConServicios, TipoHabitacionModel } from '../models/tipo-habitacion-model';
import { ServicioIncluidoModel } from '../models/servicio-habitacion-model';
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

  readonly serviciosIncluidos = httpResource<{ data: ServicioIncluidoModel[] }>(() => `${_SERVIDOR}/servicios-incluidos`);

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

  serviciosDe(tipoId: number): number[] {
    return (this.serviciosIncluidos.value()?.data ?? [])
      .filter((par) => Number(par.tipo_habitacion_id) === tipoId)
      .map((par) => Number(par.servicio_habitacion_id));
  }

  recargar(): void {
    this.tiposFiltrados.reload();
    this.tipos.reload();
    this.serviciosIncluidos.reload();
  }

  guardar(datos: TipoConServicios, id?: number): Observable<unknown> {
    const peticion = id !== undefined
      ? this.http.put<{ data: TipoHabitacionModel }>(`${_SERVIDOR}/tipos-habitacion/${id}`, datos.tipo)
      : this.http.post<{ data: TipoHabitacionModel }>(`${_SERVIDOR}/tipos-habitacion`, datos.tipo);

    return peticion.pipe(
      map((respuesta) => Number(id ?? respuesta.data.id)),
      switchMap((tipoId) => this.sincronizarServicios(tipoId, datos.servicios))
    );
  }

  private sincronizarServicios(tipoId: number, servicios: number[]): Observable<unknown> {
    const actuales = this.serviciosDe(tipoId);
    const agregar = servicios.filter((servicio) => !actuales.includes(servicio));
    const quitar = actuales.filter((servicio) => !servicios.includes(servicio));

    const peticiones = [
      ...agregar.map((servicio) => this.http.post(`${_SERVIDOR}/servicios-incluidos`, { tipo_habitacion_id: tipoId, servicio_habitacion_id: servicio })),
      ...quitar.map((servicio) => this.http.delete(`${_SERVIDOR}/servicios-incluidos/${tipoId}/${servicio}`)),
    ];

    return peticiones.length > 0 ? forkJoin(peticiones) : of(null);
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/tipos-habitacion/${id}`);
  }
}
