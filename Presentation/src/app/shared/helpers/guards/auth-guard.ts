import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  //Sin sesión válida: limpia la sesión y navega a /login (igual que CitasMedicas)
  if (!authService.isLoggedIn()) {
    authService.loggout();
    return router.createUrlTree(['/login']);
  }

  //Si la ruta indica roles, el rol del usuario debe estar en la lista
  const roles = route.data['roles'] as number[] | undefined;
  const rolUsuario = Number(authService.userActualS().rol_id);
  if (roles !== undefined && !roles.includes(rolUsuario)) {
    return router.createUrlTree(['/403']);
  }

  return true;
};
