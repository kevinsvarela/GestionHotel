export interface ClienteModel {
  id?: number;
  nombre: string;
  apellidos: string;
  identificacion: string;
  email: string;
  telefono?: string;
  activo?: number;
}

export type ClienteInput = Omit<ClienteModel, 'id' | 'activo'>;
