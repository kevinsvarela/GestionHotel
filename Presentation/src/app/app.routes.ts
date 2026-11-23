import { Routes } from '@angular/router';
import { authGuard } from './shared/helpers/guards/auth-guard';
import { Roles } from './shared/models/roles';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full'},
  { path: 'home',
    canActivate: [authGuard], data: {roles: [Roles.Admin, Roles.Recepcionista, Roles.Cliente]},
    loadComponent: () => import('./components/home-component/home-component')
      .then(m => m.HomeComponent)
  },
  { path: 'usuario',
    canActivate: [authGuard], data: {roles: [Roles.Admin, Roles.Recepcionista]},
    loadComponent: () => import('./components/usuario-component/usuario-component')
      .then(m => m.UsuarioComponent)
  },
  { path: 'habitacion',
    loadComponent: () => import('./components/habitacion-component/habitacion-component')
      .then(m => m.HabitacionComponent)
  },
  { path: 'tour',
    loadComponent: () => import('./components/tour-component/tour-component')
      .then(m => m.TourComponent)
  },
  { path: 'reserva',
    loadComponent: () => import('./components/reserva-component/reserva-component')
      .then(m => m.ReservaComponent)
  },
  { path: 'login',
    loadComponent: () => import('./components/login-component/login-component')
      .then(m => m.LoginComponent)
  },
  { path: '**',
    loadComponent: () => import('./components/error404-component/error404-component')
      .then(m => m.Error404Component)
  },

];
