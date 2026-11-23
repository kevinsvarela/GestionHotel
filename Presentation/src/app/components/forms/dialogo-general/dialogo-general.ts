import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

//Diálogo reutilizable para avisos y confirmaciones (devuelve true al aceptar)
interface DialogoGeneralData {
  icono: string;
  texto: string;
  textoAceptar?: string;
  textoCancelar?: string;
}

@Component({
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  selector: 'app-dialogo-general',
  styleUrl: './dialogo-general.css',
  templateUrl: './dialogo-general.html',
})
export class DialogoGeneral {
  readonly data = inject<DialogoGeneralData>(MAT_DIALOG_DATA);

  //Verde para éxito, rojo para error o advertencia y turquesa para lo demás
  colorIcono(): string {
    switch (this.data.icono) {
      case 'check': return 'text-[#155600]!';
      case 'error':
      case 'warning': return 'text-[#A72608]!';
      default: return 'text-[#1E9C99]!';
    }
  }
}
