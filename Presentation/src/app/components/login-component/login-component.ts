import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FrmLogin } from '../forms/frm-login/frm-login';

@Component({
  imports: [],
  selector: 'app-login-component',
  styleUrl: './login-component.css',
  templateUrl: './login-component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly dialogo = inject(MatDialog);

  // Fotos de la carpeta Presentation/resources (publicada en angular.json)
  readonly fondos = [
    'resources/Beach.jpg',
    'resources/Bird.jpeg',
    'resources/Cascade.jpg',
    'resources/Nature.jpg',
  ];

  // Cada cuánto cambia el fondo (milisegundos)
  private readonly intervaloMs = 8000;

  readonly fondoActual = signal(this.indiceAleatorio());
  private temporizador?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.mostrarDialogo();
    this.temporizador = setInterval(() => {
      this.fondoActual.set(this.indiceAleatorio(this.fondoActual()));
    }, this.intervaloMs);
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
  }

  // Devuelve una posición aleatoria del arreglo, distinta a la actual
  private indiceAleatorio(actual = -1): number {
    if (this.fondos.length < 2) {
      return 0;
    }
    let nuevo: number;
    do {
      nuevo = Math.floor(Math.random() * this.fondos.length);
    } while (nuevo === actual);
    return nuevo;
  }

  private mostrarDialogo() {
    this.dialogo.open(FrmLogin, {
      width: '100%',
      maxWidth: '400px',
      disableClose: true,
      backdropClass: 'login-backdrop',
    });
  }
}
