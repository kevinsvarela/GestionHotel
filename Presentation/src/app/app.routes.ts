import { Routes } from '@angular/router';
import { authGuard } from './shared/helpers/guards/auth-guard';
import { Roles } from './shared/models/roles';

//Permisos de la parte administrativa (el rol cliente no entra a la web por ahora)
const personal = [Roles.Admin, Roles.Recepcionista];
const soloAdmin = [Roles.Admin];

//Módulos que todavía no se han hecho: muestran la página "en construcción"
const pendiente = () => import('./components/pendiente-component/pendiente-component')
  .then(m => m.PendienteComponent);

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full'},
  { path: 'login',
    loadComponent: () => import('./components/login-component/login-component')
      .then(m => m.LoginComponent)
  },
  { path: 'home',
    canActivate: [authGuard], data: {roles: personal},
    loadComponent: () => import('./components/home-component/home-component')
      .then(m => m.HomeComponent)
  },

  //Reservas (módulo principal)
  { path: 'reserva',
    canActivate: [authGuard], data: {roles: personal, titulo: 'Reservas de hospedaje'},
    loadComponent: pendiente
  },
  { path: 'reserva-tour',
    canActivate: [authGuard], data: {roles: personal, titulo: 'Reservas de tours'},
    loadComponent: pendiente
  },
  { path: 'pago',
    canActivate: [authGuard], data: {roles: personal, titulo: 'Pagos'},
    loadComponent: pendiente
  },

  //Hospedaje
  { path: 'habitacion',
    canActivate: [authGuard], data: {roles: personal},
    loadComponent: () => import('./components/habitacion-component/habitacion-component')
      .then(m => m.HabitacionComponent)
  },
  { path: 'tipo-habitacion',
    canActivate: [authGuard], data: {roles: soloAdmin},
    loadComponent: () => import('./components/tipo-habitacion-component/tipo-habitacion-component')
      .then(m => m.TipoHabitacionComponent)
  },
  { path: 'servicio-habitacion',
    canActivate: [authGuard], data: {roles: soloAdmin, titulo: 'Servicios de habitación'},
    loadComponent: pendiente
  },

  //Tours
  { path: 'tour',
    canActivate: [authGuard], data: {roles: personal, titulo: 'Tours'},
    loadComponent: pendiente
  },
  { path: 'tour-programado',
    canActivate: [authGuard], data: {roles: personal, titulo: 'Programación de tours'},
    loadComponent: pendiente
  },
  { path: 'guia',
    canActivate: [authGuard], data: {roles: soloAdmin, titulo: 'Guías'},
    loadComponent: pendiente
  },
  { path: 'idioma',
    canActivate: [authGuard], data: {roles: soloAdmin, titulo: 'Idiomas'},
    loadComponent: pendiente
  },

  //Personas
  { path: 'cliente',
    canActivate: [authGuard], data: {roles: personal},
    loadComponent: () => import('./components/cliente-component/cliente-component')
      .then(m => m.ClienteComponent)
  },
  { path: 'usuario',
    canActivate: [authGuard], data: {roles: soloAdmin},
    loadComponent: () => import('./components/usuario-component/usuario-component')
      .then(m => m.UsuarioComponent)
  },

  //Reportes
  { path: 'reporte',
    canActivate: [authGuard], data: {roles: personal, titulo: 'Reportes'},
    loadComponent: pendiente
  },

  { path: '403',
    loadComponent: () => import('./components/error403-component/error403-component')
      .then(m => m.Error403Component)
  },
  { path: '**',
    loadComponent: () => import('./components/error404-component/error404-component')
      .then(m => m.Error404Component)
  },
];
