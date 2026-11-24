import { Component, inject, OnInit, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  pattern,
  required,
  RootFieldContext,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UsuarioCreateInput } from '../../../shared/models/usuario-model';
import { Roles } from '../../../shared/models/roles';

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatSelectModule, FormRoot, FormField],
  selector: 'app-frm-usuario',
  styleUrl: './frm-usuario.css',
  templateUrl: './frm-usuario.html',
})
export class FrmUsuario implements OnInit {
  titulo: string = "";
  dialogRef = inject(MatDialogRef<FrmUsuario>);
  private readonly data =  inject(MAT_DIALOG_DATA);

  readonly roles = [
    { id: Roles.Admin, nombre: 'Administrador' },
    { id: Roles.Recepcionista, nombre: 'Recepcionista' },
  ];

  objUsuario = signal<UsuarioCreateInput>({
    rol_id: Roles.Recepcionista,
    nombre: '',
    apellidos: '',
    identificacion: '',
    email: '',
    telefono: '',
    username: '',
    password: ''
  });

  frmUsuario = form(this.objUsuario, (s) => {
    required(s.rol_id, {message: "El rol es requerido"});
    validate(s.rol_id, (context: RootFieldContext<number>): { kind: string; message: string } | null => {
      const rol = Number(context.value());
      return rol === Roles.Admin || rol === Roles.Recepcionista
        ? null
        : { kind: 'invalid', message: 'Seleccione un rol' };
    });
    required(s.nombre, {message: "El nombre es requerido"});
    minLength(s.nombre, 2, {message: 'El nombre debe tener al menos 2 caracteres.'});
    maxLength(s.nombre, 80, {message: 'El nombre no puede superar 80 caracteres.'});
    pattern(s.nombre, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{2,80}$/, {
      message: 'El nombre solo puede tener letras y espacios.',
    });
    required(s.apellidos, {message: "Los apellidos son requeridos"});
    minLength(s.apellidos, 2, {message: 'Los apellidos deben tener al menos 2 caracteres.'});
    maxLength(s.apellidos, 120, {message: 'Los apellidos no pueden superar 120 caracteres.'});
    pattern(s.apellidos, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{2,120}$/, {
      message: 'Los apellidos solo pueden tener letras y espacios.',
    });
    pattern(s.identificacion!, /^[A-Za-z0-9-]{5,20}$/, {
      message: 'La cédula o pasaporte debe tener entre 5 y 20 letras, números o guiones.',
      when: (context) => context.value() !== '',
    });
    required(s.email, {message: "El correo es requerido"});
    maxLength(s.email, 150, {message: 'El correo no puede superar 150 caracteres.'});
    pattern(s.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: 'El correo no tiene un formato válido.',
    });
    pattern(s.telefono!, /^[2-8][0-9]{3}-[0-9]{4}$/, {
      message: 'El teléfono debe tener el formato ####-####.',
      when: (context) => context.value() !== '',
    });
    required(s.username!, {message: "Nombre de usuario es requerido"});
    pattern(s.username!, /^[a-z0-9]{8,16}$/, {
      message: 'El usuario debe tener de 8 a 16 letras minúsculas o números.',
    });
    required(s.password!, {message: "Contraseña es requerida"});
    pattern(s.password!, /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[#$@*])[\s\S]{8,64}$/, {
      message: 'La contraseña debe tener 8-64 caracteres, mayúscula, minúscula, número y #, $, @ o *.',
    });
  }, {
    submission: {
      action: async () => {
        const usuario = this.objUsuario();
        this.dialogRef.close({
          ...usuario,
          rol_id: Number(usuario.rol_id),
          nombre: usuario.nombre.trim(),
          apellidos: usuario.apellidos.trim(),
          identificacion: (usuario.identificacion ?? '').trim().toUpperCase(),
          email: usuario.email.trim().toLowerCase(),
          telefono: (usuario.telefono ?? '').trim(),
        });
      }
    }
  });

  ngOnInit(): void {
    this.titulo = this.data.title;
  }
}
