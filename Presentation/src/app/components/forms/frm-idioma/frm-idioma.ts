import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { form, FormField, FormRoot, maxLength, minLength, pattern, required } from '@angular/forms/signals';
import { IdiomaModel } from '../../../shared/models/idioma-model';

interface IdiomaDialogData {
  title: string;
  data?: IdiomaModel;
}

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, FormRoot, FormField],
  selector: 'app-frm-idioma',
  styleUrl: './frm-idioma.css',
  templateUrl: './frm-idioma.html',
})
export class FrmIdioma implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmIdioma, Omit<IdiomaModel, 'id'> | false | undefined>);
  private readonly data = inject<IdiomaDialogData>(MAT_DIALOG_DATA);

  objIdioma = signal<Omit<IdiomaModel, 'id'>>({ nombre: '' });

  frmIdioma = form(this.objIdioma, (s) => {
    required(s.nombre, { message: 'El nombre es requerido' });
    minLength(s.nombre, 3, { message: 'El nombre debe tener al menos 3 caracteres' });
    maxLength(s.nombre, 40, { message: 'El nombre no puede superar 40 caracteres' });
    pattern(s.nombre, /^[A-Za-zÑñÁÉÍÓÚáéíóúÜü ]{3,40}$/, {
      message: 'Solo letras y espacios',
    });
  }, {
    submission: {
      action: async () => {
        this.dialogRef.close({ nombre: this.objIdioma().nombre.trim() });
      }
    }
  });

  ngOnInit(): void {
    this.titulo = this.data.title;
    if (this.data.data) {
      this.objIdioma.set({ nombre: this.data.data.nombre });
    }
  }
}
