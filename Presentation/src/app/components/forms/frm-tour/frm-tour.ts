import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DuracionPipe } from '../../../shared/helpers/pipes/duracion-pipe';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  disabled, form, FormField, FormRoot, max, maxLength, min, minLength, required, RootFieldContext, validate,
} from '@angular/forms/signals';
import { TourInput, TourModel } from '../../../shared/models/tour-model';

interface TourDialogData {
  title: string;
  data?: TourModel;
  info?: boolean;
}

type ErrorCampo = { kind: string; message: string } | null;

function decimales(valor: unknown, maximo: number): boolean {
  return new RegExp(`^-?\\d+(\\.\\d{1,${maximo}})?$`).test(String(valor));
}

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField, DuracionPipe],
  selector: 'app-frm-tour',
  styleUrl: './frm-tour.css',
  templateUrl: './frm-tour.html',
})
export class FrmTour implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmTour, TourInput | false | undefined>);
  private readonly data = inject<TourDialogData>(MAT_DIALOG_DATA);
  readonly soloLectura = this.data.info === true;

  objTour = signal<TourInput>({
    nombre: '',
    descripcion: '',
    duracion_minutos: 60,
    precio_persona: 0,
    cupo_maximo: 10,
    punto_encuentro: '',
    latitud: null,
    longitud: null,
    activo: 1,
  });

  readonly enlaceMapa = computed(() => {
    const { latitud, longitud } = this.objTour();
    if (latitud === null || longitud === null || isNaN(Number(latitud)) || isNaN(Number(longitud))) {
      return null;
    }
    return `https://www.google.com/maps?q=${latitud},${longitud}`;
  });

  frmTour = form(this.objTour, (s) => {
    disabled(s, () => this.soloLectura);

    required(s.nombre, { message: 'El nombre es requerido' });
    minLength(s.nombre, 3, { message: 'El nombre debe tener al menos 3 caracteres' });
    maxLength(s.nombre, 120, { message: 'El nombre no puede superar 120 caracteres' });

    maxLength(s.descripcion, 1000, { message: 'La descripción no puede superar 1000 caracteres' });

    required(s.duracion_minutos, { message: 'La duración es requerida' });
    min(s.duracion_minutos, 1, { message: 'La duración mínima es 1 minuto' });
    max(s.duracion_minutos, 1440, { message: 'La duración máxima es 1440 minutos (24 h)' });
    validate(s.duracion_minutos, (context: RootFieldContext<number>): ErrorCampo => {
      return Number.isInteger(Number(context.value())) ? null : { kind: 'entero', message: 'Indique la duración en minutos enteros' };
    });

    required(s.precio_persona, { message: 'El precio por persona es requerido' });
    validate(s.precio_persona, (context: RootFieldContext<number>): ErrorCampo => {
      const valor = Number(context.value());
      if (isNaN(valor) || valor <= 0) {
        return { kind: 'precio', message: 'El precio debe ser mayor a 0' };
      }
      return decimales(context.value(), 2) ? null : { kind: 'decimales', message: 'El precio puede tener máximo 2 decimales' };
    });

    required(s.cupo_maximo, { message: 'El cupo máximo es requerido' });
    min(s.cupo_maximo, 1, { message: 'El cupo mínimo es 1 persona' });
    max(s.cupo_maximo, 500, { message: 'El cupo máximo es 500 personas' });
    validate(s.cupo_maximo, (context: RootFieldContext<number>): ErrorCampo => {
      return Number.isInteger(Number(context.value())) ? null : { kind: 'entero', message: 'El cupo debe ser un número entero' };
    });

    required(s.punto_encuentro, { message: 'El punto de encuentro es requerido' });
    minLength(s.punto_encuentro, 3, { message: 'Debe tener al menos 3 caracteres' });
    maxLength(s.punto_encuentro, 200, { message: 'No puede superar 200 caracteres' });

    validate(s.latitud, (context: RootFieldContext<number | null>): ErrorCampo => {
      const valor = context.value();
      if (valor === null) {
        return null;
      }
      if (isNaN(Number(valor)) || valor < -90 || valor > 90) {
        return { kind: 'rango', message: 'La latitud debe estar entre -90 y 90' };
      }
      return decimales(valor, 6) ? null : { kind: 'decimales', message: 'Use máximo 6 decimales' };
    });

    validate(s.longitud, (context: RootFieldContext<number | null>): ErrorCampo => {
      const valor = context.value();
      if (valor === null) {
        return null;
      }
      if (isNaN(Number(valor)) || valor < -180 || valor > 180) {
        return { kind: 'rango', message: 'La longitud debe estar entre -180 y 180' };
      }
      return decimales(valor, 6) ? null : { kind: 'decimales', message: 'Use máximo 6 decimales' };
    });

    validate(s.longitud, ({ value, valueOf }): ErrorCampo => {
      const latitud = valueOf(s.latitud);
      const longitud = value();
      return (latitud === null) === (longitud === null)
        ? null
        : { kind: 'pareja', message: 'Indique la latitud y la longitud juntas' };
    });

    required(s.activo, { message: 'El estado es requerido' });
  }, {
    submission: {
      action: async () => {
        if (this.soloLectura) {
          return;
        }
        const tour = this.objTour();
        this.dialogRef.close({
          nombre: tour.nombre.trim(),
          descripcion: tour.descripcion.trim(),
          duracion_minutos: Number(tour.duracion_minutos),
          precio_persona: Number(tour.precio_persona),
          cupo_maximo: Number(tour.cupo_maximo),
          punto_encuentro: tour.punto_encuentro.trim(),
          latitud: tour.latitud === null ? null : Number(tour.latitud),
          longitud: tour.longitud === null ? null : Number(tour.longitud),
          activo: Number(tour.activo),
        });
      }
    }
  });

  ngOnInit(): void {
    this.titulo = this.data.title;
    const tour = this.data.data;
    if (tour) {
      this.objTour.set({
        nombre: tour.nombre,
        descripcion: tour.descripcion ?? '',
        duracion_minutos: Number(tour.duracion_minutos),
        precio_persona: Number(tour.precio_persona),
        cupo_maximo: Number(tour.cupo_maximo),
        punto_encuentro: tour.punto_encuentro,
        latitud: tour.latitud === null || tour.latitud === undefined ? null : Number(tour.latitud),
        longitud: tour.longitud === null || tour.longitud === undefined ? null : Number(tour.longitud),
        activo: Number(tour.activo ?? 1),
      });
    }
  }
}
