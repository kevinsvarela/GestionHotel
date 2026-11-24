import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth-service';

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const srvAuth = inject(AuthService);

  return next(req).pipe(
    finalize(() => {
      if (srvAuth.sesionVencida()) {
        srvAuth.loggout();
      } else {
        srvAuth.refreshSession().subscribe();
      }
    })
  );
};
