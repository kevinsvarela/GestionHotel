import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { ClienteInput, ClienteModel } from '../models/cliente-model';
import { Roles } from '../models/roles';
import { environment } from '../../../environments/environment';

type ParametrosCliente = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaClientes {
  data: ClienteModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

interface RespuestaCliente {
  data: ClienteModel | null;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosCliente | null>(null);
  private readonly clienteId = signal<number | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(5);

  readonly clientes = httpResource<RespuestaClientes>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/usuarios/filter/${this.offset()}/${this.limit()}`,
      params: { ...parametros, rol_id: Roles.Cliente },
    };
  });

  readonly todos = httpResource<RespuestaClientes>(() => ({
    url: `${_SERVIDOR}/usuarios/filter/0/100`,
    params: { rol_id: Roles.Cliente, activo: 1 },
  }));

  readonly clientePorId = httpResource<RespuestaCliente>(() => {
    const id = this.clienteId();
    return id === null ? undefined : `${_SERVIDOR}/usuarios/${id}`;
  });

  filtrar(parametros: ParametrosCliente): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  buscarPorId(id: number | null): void {
    this.clienteId.set(id);
  }

  guardar(datos: ClienteInput, id?: number) {
    if (id !== undefined) {
      return this.http.put<any>(`${_SERVIDOR}/usuarios/${id}`, datos);
    } else {
      return this.http.post<any>(`${_SERVIDOR}/usuarios`, { ...datos, rol_id: Roles.Cliente });
    }
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${_SERVIDOR}/usuarios/${id}`);
  }
}
