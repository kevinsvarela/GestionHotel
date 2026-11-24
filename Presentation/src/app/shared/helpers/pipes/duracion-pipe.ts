import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duracion' })
export class DuracionPipe implements PipeTransform {
  transform(minutos: number | string | null | undefined): string {
    const total = Number(minutos);
    if (!Number.isFinite(total) || total <= 0) {
      return '';
    }
    const horas = Math.floor(total / 60);
    const resto = Math.round(total % 60);
    if (horas === 0) {
      return `${resto} min`;
    }
    return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
  }
}
