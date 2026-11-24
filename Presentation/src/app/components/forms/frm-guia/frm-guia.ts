import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { disabled, form, FormField, FormRoot, maxLength, minLength, pattern, required } from '@angular/forms/signals';
import { GuiaConIdiomas, GuiaModel } from '../../../shared/models/guia-model';
import { IdiomaService } from '../../../shared/services/idioma-service';

interface GuiaDialogData {
  title: string;
  data?: GuiaModel;
  idiomas?: number[];
  info?: boolean;
}

type GuiaForm = {
  nombre: string;
  telefono: string;
  idiomas: number[];
  activo: number;
};

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField],
  selector: 'app-frm-guia',
  styleUrl: './frm-guia.css',
  templateUrl: './frm-guia.html',
})
export class FrmGuia implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmGuia, GuiaConIdiomas | false | undefined>);
  private readonly data = inject<GuiaDialogData>(MAT_DIALOG_DATA);
  readonly srvIdioma = inject(IdiomaService);
  readonly soloLectura = this.data.info === true;

  objGuia = signal<GuiaForm>({
    nombre: '',
    telefono: '',
    idiomas: [],
    activo: 1,
  });

  frmGuia = form(this.objGuia, (s) => {
    disabled(s, () => this.soloLectura);

    required(s.nombre, { message: 'El nombre es requerido' });
    minLength(s.nombre, 3, { message: 'El nombre debe tener al menos 3 caracteres' });
    maxLength(s.nombre, 120, { message: 'El nombre no puede superar 120 caracteres' });
    pattern(s.nombre, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{3,120}$/, {
      message: 'El nombre solo puede tener letras y espacios',
    });

    pattern(s.telefono, /^[2-8][0-9]{3}-[0-9]{4}$/, {
      message: 'El teléfono debe tener el formato ####-####',
      when: (context) => context.value() !== '',
    });

    required(s.activo, { message: 'El estado es requerido' });
  }, {
    submission: {
      action: async () => {
        if (this.soloLectura) {
          return;
        }
        const guia = this.objGuia();
        this.dialogRef.close({
          guia: {
            nombre: guia.nombre.trim(),
            telefono: guia.telefono.trim(),
            activo: Number(guia.activo),
          },
          idiomas: guia.idiomas.map(Number),
        });
      }
    }
  });

  ngOnInit(): void {
    this.srvIdioma.idiomas.reload();
    this.titulo = this.data.title;
    if (this.data.data) {
      this.objGuia.set({
        nombre: this.data.data.nombre,
        telefono: this.data.data.telefono ?? '',
        idiomas: [...(this.data.idiomas ?? [])],
        activo: Number(this.data.data.activo ?? 1),
      });
    }
  }
}
