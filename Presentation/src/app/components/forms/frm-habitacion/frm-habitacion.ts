import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  disabled, form, FormField, FormRoot, max, maxLength, min, pattern, required, RootFieldContext, validate,
} from '@angular/forms/signals';
import { HabitacionCreateInput, HabitacionModel } from '../../../shared/models/habitacion-model';
import { TipoHabitacionService } from '../../../shared/services/tipo-habitacion-service';

interface HabitacionDialogData {
  title: string;
  data?: HabitacionModel;
  info?: boolean;
}

@Component({
  imports: [MatDialogModule, MatDividerModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField],
  selector: 'app-frm-habitacion',
  styleUrl: './frm-habitacion.css',
  templateUrl: './frm-habitacion.html',
})
export class FrmHabitacion implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmHabitacion, HabitacionCreateInput | false | undefined>);
  private readonly data = inject<HabitacionDialogData>(MAT_DIALOG_DATA);
  readonly srvTipo = inject(TipoHabitacionService);
  //En modo info el formulario solo se muestra, no se puede guardar
  readonly soloLectura = this.data.info === true;

  readonly tiposDisponibles = computed(() => {
    const actual = this.data.data?.tipo_habitacion_id;
    return (this.srvTipo.tipos.value()?.data ?? [])
      .filter((tipo) => Number(tipo.activo ?? 1) === 1 || tipo.id === actual);
  });

  readonly estados = [
    { valor: 'DISPONIBLE', texto: 'Disponible' },
    { valor: 'MANTENIMIENTO', texto: 'Mantenimiento' },
    { valor: 'FUERA_SERVICIO', texto: 'Fuera de servicio' },
  ];

  objHabitacion = signal<HabitacionCreateInput>({
    tipo_habitacion_id: 0,
    numero: '',
    piso: 1,
    estado: 'DISPONIBLE',
  });

  frmHabitacion = form(this.objHabitacion, (s) => {
    //En modo info se deshabilitan todos los campos
    disabled(s, () => this.soloLectura);

    required(s.tipo_habitacion_id, { message: 'El tipo de habitación es requerido' });
    validate(s.tipo_habitacion_id, (context: RootFieldContext<number>): { kind: string; message: string } | null => {
      const valor = Number(context.value());
      if (isNaN(valor) || !Number.isInteger(valor) || valor < 1) {
        return { kind: 'invalid', message: 'Seleccione un tipo de habitación' };
      }
      return null;
    });

    required(s.numero, { message: 'El número es requerido' });
    maxLength(s.numero, 10, { message: 'El número no puede tener más de 10 caracteres' });
    pattern(s.numero, /^[A-Z0-9-]{1,10}$/, {
      message: 'Solo letras mayúsculas, números y guiones (ej. 101 o A-12)',
    });

    required(s.piso, { message: 'El piso es requerido' });
    min(s.piso, -5, { message: 'El piso no puede ser menor a -5' });
    max(s.piso, 100, { message: 'El piso no puede ser mayor a 100' });
    validate(s.piso, (context: RootFieldContext<number>): { kind: string; message: string } | null => {
      return Number.isInteger(Number(context.value())) ? null : { kind: 'entero', message: 'El piso debe ser un número entero' };
    });

    required(s.estado, { message: 'El estado es requerido' });
  }, {
    submission: {
      action: async () => {
        if (this.soloLectura) {
          return;
        }
        this.dialogRef.close({ ...this.objHabitacion(), piso: Number(this.objHabitacion().piso) });
      }
    }
  });

  ngOnInit(): void {
    this.titulo = this.data.title;
    if (this.data.data) {
      this.objHabitacion.set({
        tipo_habitacion_id: this.data.data.tipo_habitacion_id,
        numero: this.data.data.numero,
        piso: this.data.data.piso,
        estado: this.data.data.estado,
      });
    }
  }
}
