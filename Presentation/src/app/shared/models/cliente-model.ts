export interface ClienteModel {
  id?: number;
  nombre: string;
  apellidos: string;
  email: string;
  telefono?: string;
  activo?: number;
}

export type ClienteInput = Omit<ClienteModel, 'id' | 'activo'>;
