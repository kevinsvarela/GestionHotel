import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogoGeneral } from './components/forms/dialogo-general/dialogo-general';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './shared/services/auth-service';

type MenuItem = {
  label : string;
  icon : string;
  route : string;
  rol : number[];
}

type MenuGrupo = {
  titulo : string;
  items : MenuItem[];
}

@Component({
  imports: [RouterOutlet, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatMenuModule, MatSidenavModule, MatListModule, MatDividerModule, MatDialogModule
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {

  protected readonly title = signal('gestion_hotel');
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  //true cuando la página actual es el login (cambia el estilo del encabezado)
  protected readonly enLogin = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects.startsWith('/login'))
    ),
    { initialValue: false }
  );

  mostrarAyuda(): void {
    const texto = this.authService.isLoggedIn()
      ? 'Use el menú de la izquierda para moverse entre los módulos. Las opciones que ve dependen de su rol.\n\nSi necesita más permisos, comuníquese con el administrador del sistema.'
      : 'Ingrese con el usuario y la contraseña que le asignó el administrador del hotel.\n\nSi olvidó su contraseña o no puede entrar, comuníquese con el administrador del sistema.';
    this.dialog.open(DialogoGeneral, {
      width: '90vw',
      maxWidth: '24rem',
      data: { icono: 'help', texto: texto, textoAceptar: ' Entendido ' },
    });
  }


//Menú agrupado por secciones. Roles: 1 Admin, 2 Recepcionista
  menuGrupos: MenuGrupo[] = [
    {titulo: '', items: [
      {label: 'Inicio', icon: 'dashboard', route: 'home', rol: [1, 2]},
    ]},
    {titulo: 'Reservas', items: [
      {label: 'Hospedaje', icon: 'hotel', route: 'reserva', rol: [1, 2]},
      {label: 'Tours', icon: 'event_available', route: 'reserva-tour', rol: [1, 2]},
      {label: 'Pagos', icon: 'payments', route: 'pago', rol: [1, 2]},
    ]},
    {titulo: 'Hospedaje', items: [
      {label: 'Habitaciones', icon: 'bed', route: 'habitacion', rol: [1, 2]},
      {label: 'Tipos de habitación', icon: 'category', route: 'tipo-habitacion', rol: [1]},
      {label: 'Servicios', icon: 'room_service', route: 'servicio-habitacion', rol: [1]},
    ]},
    {titulo: 'Tours', items: [
      {label: 'Tours', icon: 'tour', route: 'tour', rol: [1, 2]},
      {label: 'Programación', icon: 'calendar_month', route: 'tour-programado', rol: [1, 2]},
      {label: 'Guías', icon: 'hiking', route: 'guia', rol: [1]},
      {label: 'Idiomas', icon: 'translate', route: 'idioma', rol: [1]},
    ]},
    {titulo: 'Personas', items: [
      {label: 'Clientes', icon: 'person_search', route: 'cliente', rol: [1, 2]},
      {label: 'Usuarios del sistema', icon: 'manage_accounts', route: 'usuario', rol: [1]},
    ]},
    {titulo: 'Análisis', items: [
      {label: 'Reportes', icon: 'bar_chart', route: 'reporte', rol: [1, 2]},
    ]},
  ];

  //Solo se muestran las opciones y secciones del rol que inició sesión
  protected readonly menuVisible = computed(() => {
    const rol = Number(this.authService.userActualS().rol_id);
    return this.menuGrupos
      .map(grupo => ({...grupo, items: grupo.items.filter(item => item.rol.includes(rol))}))
      .filter(grupo => grupo.items.length > 0);
  });


    loggout(){
      this.authService.loggout();
    }

}
