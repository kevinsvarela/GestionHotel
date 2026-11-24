import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { GuiaModel } from '../models/guia-model';
import { environment } from '../../../environments/environment';

const _SERVIDOR = environment.servidor;

interface RespuestaGuias {
  data: GuiaModel[];
}

@Injectable({ providedIn: 'root' })
export class GuiaService {
  readonly guias = httpResource<RespuestaGuias>(() => `${_SERVIDOR}/guias`);
}
