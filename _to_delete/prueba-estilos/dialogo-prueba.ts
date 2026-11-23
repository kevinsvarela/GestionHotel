import { Component, inject, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  selector: 'app-dialogo-prueba',
  styleUrl: './dialogo-prueba.css',
  templateUrl: './dialogo-prueba.html',
  encapsulation: ViewEncapsulation.None,
})
export class DialogoPrueba {
  readonly data = inject<{ titulo: string }>(MAT_DIALOG_DATA);
}
