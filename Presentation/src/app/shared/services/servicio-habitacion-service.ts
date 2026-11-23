import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { ServicioHabitacionInput, ServicioHabitacionModel } from '../models/servicio-habitacion-model';
import { environment } from '../../../environments/environment';

type ParametrosServicio = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaServicios {
  data: ServicioHabitacionModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaServicio {
  data: ServicioHabitacionModel | null;
}

@Injectable({ providedIn: 'root' })
export class ServicioHabitacionService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosServicio | null>(null);
  private readonly servicioId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(10);

  readonly servicios = httpResource<RespuestaServicios>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/servicios-habitacion/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  readonly servicioPorId = httpResource<RespuestaServicio>(() => {
    const id = this.servicioId();
    return id === null ? undefined : `${_SERVIDOR}/servicios-habitacion/${id}`;
  });

  filtrar(parametros: ParametrosServicio): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.servicioId.set(id);
  }

  guardar(datos: ServicioHabitacionInput, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/servicios-habitacion/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/servicios-habitacion`, datos);
    }
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/servicios-habitacion/${id}`);
  }
}
