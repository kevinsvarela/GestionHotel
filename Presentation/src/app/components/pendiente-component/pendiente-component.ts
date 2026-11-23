import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

//Página temporal para los módulos que todavía no se han desarrollado
@Component({
  imports: [RouterModule, MatIconModule],
  selector: 'app-pendiente-component',
  styleUrl: './pendiente-component.css',
  templateUrl: './pendiente-component.html',
})
export class PendienteComponent {
  readonly modulo: string = inject(ActivatedRoute).snapshot.data['titulo'] ?? 'Este módulo';
}
