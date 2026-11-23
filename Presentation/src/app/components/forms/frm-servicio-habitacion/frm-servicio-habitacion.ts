import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { form, FormField, FormRoot, maxLength, minLength, pattern, required } from '@angular/forms/signals';
import { ServicioHabitacionInput, ServicioHabitacionModel } from '../../../shared/models/servicio-habitacion-model';

interface ServicioDialogData {
  title: string;
  data?: ServicioHabitacionModel;
}

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, FormRoot, FormField],
  selector: 'app-frm-servicio-habitacion',
  styleUrl: './frm-servicio-habitacion.css',
  templateUrl: './frm-servicio-habitacion.html',
})
export class FrmServicioHabitacion implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmServicioHabitacion, ServicioHabitacionInput | false | undefined>);
  private readonly data = inject<ServicioDialogData>(MAT_DIALOG_DATA);

  objServicio = signal<ServicioHabitacionInput>({ nombre: '' });

  frmServicio = form(this.objServicio, (s) => {
    required(s.nombre, { message: 'El nombre es requerido' });
    minLength(s.nombre, 2, { message: 'El nombre debe tener al menos 2 caracteres' });
    maxLength(s.nombre, 60, { message: 'El nombre no puede superar 60 caracteres' });
    pattern(s.nombre, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü0-9 -]{2,60}$/, {
      message: 'Solo letras, números, espacios y guiones',
    });
  }, {
    submission: {
      action: async () => {
        this.dialogRef.close({ nombre: this.objServicio().nombre.trim() });
      }
    }
  });

  ngOnInit(): void {
    this.titulo = this.data.title;
    if (this.data.data) {
      this.objServicio.set({ nombre: this.data.data.nombre });
    }
  }
}
