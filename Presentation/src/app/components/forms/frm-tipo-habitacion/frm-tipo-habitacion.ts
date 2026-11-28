import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  disabled, form, FormField, FormRoot, max, maxLength, min, minLength, pattern, required, RootFieldContext, validate,
} from '@angular/forms/signals';
import { TipoConServicios, TipoHabitacionInput, TipoHabitacionModel } from '../../../shared/models/tipo-habitacion-model';
import { ServicioHabitacionService } from '../../../shared/services/servicio-habitacion-service';

interface TipoDialogData {
  title: string;
  data?: TipoHabitacionModel;
  servicios?: number[];
  info?: boolean;
}

type TipoForm = TipoHabitacionInput & {
  servicios: number[];
};

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField],
  selector: 'app-frm-tipo-habitacion',
  styleUrl: './frm-tipo-habitacion.css',
  templateUrl: './frm-tipo-habitacion.html',
})
export class FrmTipoHabitacion implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmTipoHabitacion, TipoConServicios | false | undefined>);
  private readonly data = inject<TipoDialogData>(MAT_DIALOG_DATA);
  readonly srvServicio = inject(ServicioHabitacionService);
  readonly soloLectura = this.data.info === true;

  objTipo = signal<TipoForm>({
    nombre: '',
    descripcion: '',
    capacidad: 1,
    precio_noche: 0,
    servicios: [],
    activo: 1,
  });

  frmTipo = form(this.objTipo, (s) => {
    disabled(s, () => this.soloLectura);

    required(s.nombre, { message: 'El nombre es requerido' });
    minLength(s.nombre, 3, { message: 'El nombre debe tener al menos 3 caracteres' });
    maxLength(s.nombre, 60, { message: 'El nombre no puede superar 60 caracteres' });
    pattern(s.nombre, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{3,60}$/, {
      message: 'El nombre solo puede tener letras y espacios',
    });

    maxLength(s.descripcion, 1000, { message: 'La descripción no puede superar 1000 caracteres' });

    required(s.capacidad, { message: 'La capacidad es requerida' });
    min(s.capacidad, 1, { message: 'La capacidad mínima es 1 persona' });
    max(s.capacidad, 20, { message: 'La capacidad máxima es 20 personas' });
    validate(s.capacidad, (context: RootFieldContext<number>): { kind: string; message: string } | null => {
      return Number.isInteger(Number(context.value())) ? null : { kind: 'entero', message: 'La capacidad debe ser un número entero' };
    });

    required(s.precio_noche, { message: 'El precio por noche es requerido' });
    validate(s.precio_noche, (context: RootFieldContext<number>): { kind: string; message: string } | null => {
      const valor = Number(context.value());
      if (isNaN(valor) || valor <= 0) {
        return { kind: 'precio', message: 'El precio debe ser mayor a 0' };
      }
      if (!/^\d+(\.\d{1,2})?$/.test(String(context.value()))) {
        return { kind: 'decimales', message: 'El precio puede tener máximo 2 decimales' };
      }
      return null;
    });

    required(s.activo, { message: 'El estado es requerido' });
  }, {
    submission: {
      action: async () => {
        if (this.soloLectura) {
          return;
        }
        const tipo = this.objTipo();
        this.dialogRef.close({
          tipo: {
            nombre: tipo.nombre.trim(),
            descripcion: tipo.descripcion.trim(),
            capacidad: Number(tipo.capacidad),
            precio_noche: Number(tipo.precio_noche),
            activo: Number(tipo.activo),
          },
          servicios: tipo.servicios.map(Number),
        });
      }
    }
  });

  ngOnInit(): void {
    this.srvServicio.catalogo.reload();
    this.titulo = this.data.title;
    if (this.data.data) {
      this.objTipo.set({
        nombre: this.data.data.nombre,
        descripcion: this.data.data.descripcion ?? '',
        capacidad: Number(this.data.data.capacidad),
        precio_noche: Number(this.data.data.precio_noche),
        servicios: [...(this.data.servicios ?? [])],
        activo: Number(this.data.data.activo ?? 1),
      });
    }
  }
}
