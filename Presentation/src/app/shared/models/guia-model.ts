export interface GuiaModel {
  id?: number;
  nombre: string;
  telefono?: string | null;
  activo?: number;
}

export interface GuiaInput {
  nombre: string;
  telefono: string;
  activo: number;
}

export interface GuiaConIdiomas {
  guia: GuiaInput;
  idiomas: number[];
}
