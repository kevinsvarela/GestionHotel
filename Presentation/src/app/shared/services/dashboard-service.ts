import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DashboardModel } from '../models/dashboard-model';
import { environment } from '../../../environments/environment';

const _SERVIDOR = environment.servidor;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  readonly resumen = httpResource<{ data: DashboardModel }>(() => `${_SERVIDOR}/dashboard`);
}
