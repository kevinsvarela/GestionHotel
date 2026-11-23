export interface UsuarioModel {
  id?: number;
  rol_id: number;
  rol_nombre: string;
  nombre: string;
  apellidos: string;
  identificacion?: string;
  email: string;
  username?: string;
  password?: string;
  telefono?: string;
  activo?: number;
}

export type UsuarioCreateInput = Omit<UsuarioModel, 'id' | 'rol_nombre' | 'activo'>;
export type UsuarioUpdateInput = Omit<UsuarioModel, 'rol_nombre' | 'password'> & {id:number};
