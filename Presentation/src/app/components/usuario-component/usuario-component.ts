import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {MatTableModule} from '@angular/material/table';
import { UsuarioService } from '../../shared/services/usuario-service';
import { UsuarioModel } from '../../shared/models/usuario-model';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FrmUsuario } from '../forms/frm-usuario/frm-usuario';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';
import { Roles } from '../../shared/models/roles';


@Component({
  imports: [MatTableModule, MatTooltipModule, MatButtonModule, MatIconModule,
            MatDialogModule
],
  selector: 'app-usuario-component',
  styleUrl: './usuario-component.css',
  templateUrl: './usuario-component.html',
})
export class UsuarioComponent implements OnInit {
  displayedColumns: string[] =
  ['id', 'identificacion', 'nombre', 'email', 'rol_nombre', 'telefono', 'botonera'];

  dataSource = signal<UsuarioModel[]>([]);

  srvUsuario = inject(UsuarioService);

  dialog = inject(MatDialog);

  constructor() {
    effect(() => {
    const respuesta = this.srvUsuario.usuarios.value();
    if(respuesta !== undefined) {
      this.dataSource.set(respuesta.data);
    }
    });
  }


  public mostrarDialogo(titulo: string, datos? : UsuarioModel, info? : boolean){
    const dialogRef= this.dialog.open(FrmUsuario, {
      width: '92vw',
      maxWidth: '36rem',
      panelClass: 'dialogo-hotel',
      autoFocus: false,
      data: {
        title: titulo,
        data: datos,
        info: info
      },
      disableClose: true
    });

    dialogRef.afterClosed()
      .subscribe((objUsuario)=>{
        if(objUsuario === undefined){
          return;
        }
        this.srvUsuario.guardar(objUsuario)
        .subscribe({
          complete : () =>{
            this.srvUsuario.usuarios.reload();
            this.alertar('check', 'Usuario registrado');
          },
          error: (error: HttpErrorResponse) => {
            this.alertar('error', this.mensajeError(error));
          },
        });
      });
  }

  private alertar(icono: string, mensaje: string) {
    return this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '24rem',
      data: { icono: icono, texto: mensaje, textoAceptar: ' Aceptar ' },
    });
  }

  private mensajeError(error: HttpErrorResponse): string {
    const payload: unknown = error.error;
    if (typeof payload === 'object' && payload !== null) {
      const respuesta = payload as Record<string, unknown>;
      if (typeof respuesta['error'] === 'string') {
        return respuesta['error'];
      }

      const errores = respuesta['errors'];
      if (typeof errores === 'object' && errores !== null) {
        const mensajes = Object.values(errores as Record<string, unknown>)
          .filter((mensaje): mensaje is string => typeof mensaje === 'string');
        if (mensajes.length > 0) {
          return mensajes.join('\n');
        }
      }
    }

    return `No se pudieron guardar los datos (HTTP ${error.status}).`;
  }

  //Fin de mostrar dialogo

  onCreate(): void{
    this.mostrarDialogo('Nuevo usuario');
  }

  onEdit(idUsuario : number){
    console.log('Editando usuario', idUsuario);
  }

  onDelete(idUsuario : number){
    console.log('Eliminar usuario', idUsuario);
  }

  onInfo(idUsuario : number){
    console.log('Ver informacion usuario', idUsuario);
  }

  onResetPassword(idUsuario : number){
    console.log('Resetear contraseña de ', idUsuario);
  }

  ngOnInit(): void {
    this.srvUsuario.filtrar( {nombre: '', apellidos: '', email: '', rol: '', excluir_rol_id: Roles.Cliente});
  }
}
