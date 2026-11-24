import { inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TokenService } from './token-service';
import { Router } from '@angular/router';
import { User } from '../models/User';
import { IToken, LoginForm } from '../models/interfaces';
import { tap, map, catchError, of } from 'rxjs';

const servidor = environment.servidor + '/auth';

@Service()
export class AuthService {
    private http = inject(HttpClient);
    private readonly srvTokens = inject(TokenService);
    private readonly router = inject(Router);
    public userActualS = signal(this.userActual);
    private timerExp?: ReturnType<typeof setTimeout>;

    constructor() {
        if (this.isLoggedIn()) {
            this.programarCierre();
        }
    }

    private programarCierre(): void {
        clearTimeout(this.timerExp);
        const ms = Math.max(this.srvTokens.tokenTimeToExp() * 1000 - 1000, 0);
        this.timerExp = setTimeout(() => this.loggout(), ms);
    }

    public login(datos : LoginForm) {
        clearTimeout(this.timerExp);
        this.srvTokens.eliminarTokens();
        return this.http.post<IToken>(`${servidor}/login`, datos)
        .pipe(
            tap((tokens) => {
            this.doLogin(tokens);
            }),
            map(() => true),
            catchError((error) => {
            return of (error.status);
            })
        );
    }

    public loggout() {
        if (this.srvTokens.token) {
            this.http.delete(`${servidor}/loggout/${this.userActual.id}`)
                .subscribe({ error: () => undefined });
        }
        this.doLoggOut();
    }

    public isLoggedIn() : boolean {
        return !!this.srvTokens.token && !this.srvTokens.jwtTokenExp();
    }

    public sesionVencida() : boolean {
        return !!this.srvTokens.token && !!this.srvTokens.jwtTokenExp();
    }

    public refreshSession() {
        if (this.isLoggedIn() && this.srvTokens.tokenTimeToExp() <= 900) {
            return this.http.patch<IToken>(`${servidor}/refresh-session/${this.userActual.id}`,
                { tkRef: this.srvTokens.refreshToken })
                .pipe(
                    tap((tokens) => {
                        if (this.srvTokens.token) {
                            this.doLogin(tokens);
                        }
                    }),
                    map(() => true),
                    catchError(() => of(false))
                );
        }
        return of(false);
    }

    doLogin(tokens : IToken) {
        this.srvTokens.setTokens(tokens);
        this.userActualS.set(this.userActual);
        this.programarCierre();
    }

    doLoggOut() {
        clearTimeout(this.timerExp);
        if (this.srvTokens.token) {
        this.srvTokens.eliminarTokens();
        }
        this.userActualS.set(this.userActual);
        this.router.navigate(['/login']);
   }

    private get userActual() : User {
        if (!this.srvTokens.token) {
            return new User();
        }else{
            const tokenD = this.srvTokens.decodeToken();
            return new User({id: tokenD.sub, username: tokenD.username, rol_id: tokenD.rol_id});
        }
    }
}
