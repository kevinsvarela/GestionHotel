import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogoPrueba } from './dialogo-prueba';

interface HabitacionPrueba {
  id: number;
  numero: string;
  tipo: string;
  piso: number;
  estado: 'DISPONIBLE' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
}

@Component({
  imports: [MatTableModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatTooltipModule, MatPaginatorModule, MatDialogModule],
  selector: 'app-prueba-estilos',
  styleUrl: './prueba-estilos.css',
  templateUrl: './prueba-estilos.html',
})
export class PruebaEstilos {
  private readonly dialog = inject(MatDialog);

  variante = signal<'A' | 'B'>('A');

  displayedColumns = ['numero', 'tipo', 'piso', 'estado', 'acciones'];

  readonly habitaciones: HabitacionPrueba[] = [
    { id: 1, numero: '101', tipo: 'Estándar sencilla', piso: 1, estado: 'DISPONIBLE' },
    { id: 2, numero: '102', tipo: 'Estándar sencilla', piso: 1, estado: 'DISPONIBLE' },
    { id: 3, numero: '103', tipo: 'Estándar doble', piso: 1, estado: 'MANTENIMIENTO' },
    { id: 4, numero: '201', tipo: 'Superior', piso: 2, estado: 'DISPONIBLE' },
    { id: 5, numero: '202', tipo: 'Familiar', piso: 2, estado: 'DISPONIBLE' },
  ];

  readonly estados: Record<string, { texto: string; clase: string }> = {
    DISPONIBLE: { texto: 'Disponible', clase: 'estado-verde' },
    MANTENIMIENTO: { texto: 'Mantenimiento', clase: 'estado-amarillo' },
    FUERA_SERVICIO: { texto: 'Fuera de servicio', clase: 'estado-rojo' },
  };

  abrirFormulario(titulo: string): void {
    this.dialog.open(DialogoPrueba, {
      width: '92vw',
      maxWidth: '36rem',
      panelClass: 'dialogo-prueba',
      autoFocus: false,
      data: { titulo },
    });
  }
}
