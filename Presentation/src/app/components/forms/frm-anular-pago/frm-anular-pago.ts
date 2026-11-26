import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { PagoModel } from '../../../shared/models/pago-model';

type AnulacionForm = {
  motivo: string;
};

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
            FormRoot, FormField, CurrencyPipe],
  selector: 'app-frm-anular-pago',
  styleUrl: './frm-anular-pago.css',
  templateUrl: './frm-anular-pago.html',
})
export class FrmAnularPago {
  readonly dialogRef = inject(MatDialogRef<FrmAnularPago, string | false | undefined>);
  readonly pago = inject<PagoModel>(MAT_DIALOG_DATA);

  readonly motivosRapidos = ['Monto digitado mal', 'Pago duplicado', 'Reserva equivocada', 'Método de pago equivocado'];

  objAnulacion = signal<AnulacionForm>({ motivo: '' });

  frmAnulacion = form(this.objAnulacion, (s) => {
    required(s.motivo, { message: 'Indique el motivo de la anulación' });
    minLength(s.motivo, 5, { message: 'El motivo debe tener al menos 5 caracteres' });
    maxLength(s.motivo, 200, { message: 'El motivo no puede superar 200 caracteres' });
  }, {
    submission: {
      action: async () => {
        this.dialogRef.close(this.objAnulacion().motivo.trim());
      }
    }
  });

  usarMotivo(motivo: string): void {
    this.objAnulacion.set({ motivo });
  }
}
