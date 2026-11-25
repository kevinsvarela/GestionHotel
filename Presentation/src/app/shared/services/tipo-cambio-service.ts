import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { TipoCambioModel } from '../models/pago-model';
import { environment } from '../../../environments/environment';

const _SERVIDOR = environment.servidor;

@Injectable({ providedIn: 'root' })
export class TipoCambioService {
  readonly hoy = httpResource<{ data: TipoCambioModel }>(() => `${_SERVIDOR}/tipo-cambio`);
}
