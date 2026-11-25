import { Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ConsultaReporte, DatosReporte } from '../models/reporte-model';
import { environment } from '../../../environments/environment';

const _SERVIDOR = environment.servidor;

@Injectable({ providedIn: 'root' })
export class ReporteService {
  readonly consulta = signal<ConsultaReporte | null>(null);

  readonly reporte = httpResource<{ data: DatosReporte }>(() => {
    const consulta = this.consulta();
    if (consulta === null) {
      return undefined;
    }
    return {
      url: `${_SERVIDOR}/reportes/${consulta.tipo}`,
      params: { desde: consulta.desde, hasta: consulta.hasta },
    };
  });

  consultar(consulta: ConsultaReporte): void {
    this.consulta.set({ ...consulta });
  }
}
