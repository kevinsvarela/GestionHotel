import { Component, signal, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { MatInput } from "@angular/material/input";
import { LoginForm } from '../../../shared/models/interfaces';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogoGeneral } from '../dialogo-general/dialogo-general';
import { AuthService } from '../../../shared/services/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-frm-login',
  imports: [MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatFormField, FormRoot, MatInput, FormField, MatProgressSpinnerModule],
  templateUrl: './frm-login.html',
  styleUrl: './frm-login.css',
})
export class FrmLogin {

  private readonly srvAuth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  dialogRef = inject(MatDialogRef<FrmLogin>)
  public mostrarError = signal(false);
  //Mostrar u ocultar la contraseña (botón del ojo)
  public verPassword = signal(false);
  //Aviso cuando Bloq Mayús está activado
  public bloqMayus = signal(false);
  //Mientras se valida el usuario se bloquea el botón
  public cargando = signal(false);
  objLogin = signal<LoginForm>( {
    username : '',
    password: ''
  });

  frmLogin = form(this.objLogin, (s)=> {
    required(s.username, { message: 'Usuario es requerido'});
    required(s.password, { message: 'Contraseña es requerida'});
    
  },
  {
    submission: {
      action: async () => {
        this.loggin(this.objLogin());
      }
    }
  }
);

loggin(datos : LoginForm) {
     this.cargando.set(true);
     this.srvAuth.login(datos)
       .subscribe({
         next: (res) => {
           this.cargando.set(false);
           if (res && res != 401) {
            this.dialogRef.close(true);
             this.router.navigate(['/home']);
           }else{
              this.mostrarError.set(true);
           }
         },
         error: () => {
           this.cargando.set(false);
           this.mostrarError.set(true);
         },
       })
 }

 revisarMayusculas(evento: KeyboardEvent): void {
   this.bloqMayus.set(evento.getModifierState?.('CapsLock') ?? false);
 }

 //Sistema interno: la contraseña la restablece el administrador desde Usuarios
 olvidoPassword(): void {
   this.dialog.open(DialogoGeneral, {
     width: '90vw',
     maxWidth: '24rem',
     data: {
       icono: 'lock_reset',
       texto: 'Comuníquese con el administrador del sistema para que restablezca su contraseña.\n\nPor seguridad, el hotel no envía contraseñas por correo.',
       textoAceptar: ' Entendido ',
     },
   });
 }

}
