import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { IdiomaModel } from '../models/idioma-model';
import { environment } from '../../../environments/environment';

const _SERVIDOR = environment.servidor;

@Injectable({ providedIn: 'root' })
export class IdiomaService {
  readonly idiomas = httpResource<{ data: IdiomaModel[] }>(() => `${_SERVIDOR}/idiomas`);
}
