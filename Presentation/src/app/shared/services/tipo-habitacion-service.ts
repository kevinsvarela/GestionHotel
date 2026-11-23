import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { TipoHabitacionModel } from '../models/tipo-habitacion-model';
import { environment } from '../../../environments/environment';

const _SERVIDOR = environment.servidor;

interface RespuestaTiposHabitacion {
  data: TipoHabitacionModel[];
}

@Injectable({ providedIn: 'root' })
export class TipoHabitacionService {
  //Lista completa de tipos, se usa para llenar los combos de los formularios
  readonly tipos = httpResource<RespuestaTiposHabitacion>(() => `${_SERVIDOR}/tipos-habitacion`);
}
