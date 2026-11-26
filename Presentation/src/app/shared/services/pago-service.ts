import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { PagoInput, PagoModel } from '../models/pago-model';
import { environment } from '../../../environments/environment';

type ParametrosPago = Record<string, string | number | boolean>;
const _SERVIDOR = environment.servidor;

interface RespuestaPagos {
  data: PagoModel[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly http = inject(HttpClient);
  private readonly parametros = signal<ParametrosPago | null>(null);
  readonly offset = signal(0);
  readonly limit = signal(10);

  readonly pagos = httpResource<RespuestaPagos>(() => {
    const parametros = this.parametros();
    if (parametros === null) {
      return undefined;
    }

    return {
      url: `${_SERVIDOR}/pagos/filter/${this.offset()}/${this.limit()}`,
      params: parametros,
    };
  });

  filtrar(parametros: ParametrosPago): void {
    this.offset.set(0);
    this.parametros.set({ ...parametros });
  }

  cambiarPagina(offset: number, limit: number): void {
    this.offset.set(offset);
    this.limit.set(limit);
  }

  registrar(datos: PagoInput) {
    const cuerpo: Record<string, unknown> = { ...datos };
    if (datos.reserva_habitacion_id === null) {
      delete cuerpo['reserva_habitacion_id'];
    }
    if (datos.reserva_tour_id === null) {
      delete cuerpo['reserva_tour_id'];
    }
    return this.http.post<any>(`${_SERVIDOR}/pagos`, cuerpo);
  }

  anular(id: number, motivo: string) {
    return this.http.patch<any>(`${_SERVIDOR}/pagos/${id}/anular`, { motivo });
  }
}
