import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  disabled, form, FormField, FormRoot, maxLength, minLength, pattern, required,
} from '@angular/forms/signals';
import { ClienteInput, ClienteModel } from '../../../shared/models/cliente-model';

interface ClienteDialogData {
  title: string;
  data?: ClienteModel;
  info?: boolean;
}

@Component({
  imports: [MatDialogModule, MatDividerModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, FormRoot, FormField],
  selector: 'app-frm-cliente',
  styleUrl: './frm-cliente.css',
  templateUrl: './frm-cliente.html',
})
export class FrmCliente implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmCliente, ClienteInput | false | undefined>);
  private readonly data = inject<ClienteDialogData>(MAT_DIALOG_DATA);
  readonly soloLectura = this.data.info === true;

  objCliente = signal<ClienteInput>({
    nombre: '',
    apellidos: '',
    identificacion: '',
    email: '',
    telefono: '',
  });

  frmCliente = form(this.objCliente, (s) => {
    disabled(s, () => this.soloLectura);

    required(s.nombre, { message: 'El nombre es requerido' });
    minLength(s.nombre, 2, { message: 'El nombre debe tener al menos 2 caracteres' });
    maxLength(s.nombre, 80, { message: 'El nombre no puede superar 80 caracteres' });
    pattern(s.nombre, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{2,80}$/, {
      message: 'El nombre solo puede tener letras y espacios',
    });

    required(s.apellidos, { message: 'Los apellidos son requeridos' });
    minLength(s.apellidos, 2, { message: 'Los apellidos deben tener al menos 2 caracteres' });
    maxLength(s.apellidos, 120, { message: 'Los apellidos no pueden superar 120 caracteres' });
    pattern(s.apellidos, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{2,120}$/, {
      message: 'Los apellidos solo pueden tener letras y espacios',
    });

    required(s.identificacion, { message: 'La cédula o pasaporte es requerida' });
    pattern(s.identificacion, /^[A-Za-z0-9-]{5,20}$/, {
      message: 'Entre 5 y 20 letras, números o guiones (ej. 1-0234-0567)',
    });

    required(s.email, { message: 'El correo es requerido' });
    maxLength(s.email, 150, { message: 'El correo no puede superar 150 caracteres' });
    pattern(s.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: 'El correo no tiene un formato válido',
    });

    pattern(s.telefono!, /^[2-8][0-9]{3}-[0-9]{4}$/, {
      message: 'El teléfono debe tener el formato ####-####',
      when: (context) => context.value() !== '',
    });
  }, {
    submission: {
      action: async () => {
        if (this.soloLectura) {
          return;
        }
        const cliente = this.objCliente();
        this.dialogRef.close({
          nombre: cliente.nombre.trim(),
          apellidos: cliente.apellidos.trim(),
          identificacion: cliente.identificacion.trim().toUpperCase(),
          email: cliente.email.trim().toLowerCase(),
          telefono: cliente.telefono?.trim() ?? '',
        });
      }
    }
  });

  ngOnInit(): void {
    this.titulo = this.data.title;
    if (this.data.data) {
      this.objCliente.set({
        nombre: this.data.data.nombre,
        apellidos: this.data.data.apellidos,
        identificacion: this.data.data.identificacion ?? '',
        email: this.data.data.email,
        telefono: this.data.data.telefono ?? '',
      });
    }
  }
}
