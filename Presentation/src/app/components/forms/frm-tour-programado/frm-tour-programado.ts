import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { disabled, form, FormField, FormRoot, min, required, RootFieldContext, validate } from '@angular/forms/signals';
import { EstadoTourProgramado, TourProgramadoInput, TourProgramadoModel } from '../../../shared/models/tour-programado-model';
import { TourService } from '../../../shared/services/tour-service';
import { GuiaService } from '../../../shared/services/guia-service';

interface ProgramadoDialogData {
  title: string;
  data?: TourProgramadoModel;
  info?: boolean;
}

type ErrorCampo = { kind: string; message: string } | null;

type ProgramadoForm = {
  tour_id: number;
  guia_id: number | null;
  fecha: string;
  hora: string;
  cupo: number;
  estado: EstadoTourProgramado;
};

@Component({
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, FormRoot, FormField],
  selector: 'app-frm-tour-programado',
  styleUrl: './frm-tour-programado.css',
  templateUrl: './frm-tour-programado.html',
})
export class FrmTourProgramado implements OnInit {
  titulo: string = '';
  readonly dialogRef = inject(MatDialogRef<FrmTourProgramado, TourProgramadoInput | false | undefined>);
  private readonly data = inject<ProgramadoDialogData>(MAT_DIALOG_DATA);
  readonly srvTour = inject(TourService);
  readonly srvGuia = inject(GuiaService);
  readonly soloLectura = this.data.info === true;
  readonly esNuevo = this.data.data === undefined;

  readonly estados: { valor: EstadoTourProgramado; texto: string }[] = [
    { valor: 'PROGRAMADO', texto: 'Programado' },
    { valor: 'EN_CURSO', texto: 'En curso' },
    { valor: 'FINALIZADO', texto: 'Finalizado' },
    { valor: 'CANCELADO', texto: 'Cancelado' },
  ];

  objProgramado = signal<ProgramadoForm>({
    tour_id: 0,
    guia_id: null,
    fecha: '',
    hora: '08:00',
    cupo: 1,
    estado: 'PROGRAMADO',
  });

  readonly toursDisponibles = computed(() => {
    const actual = this.data.data?.tour_id;
    return (this.srvTour.todos.value()?.data ?? [])
      .filter((tour) => Number(tour.activo ?? 1) === 1 || tour.id === actual);
  });

  readonly guiasDisponibles = computed(() => {
    const actual = this.data.data?.guia_id;
    return (this.srvGuia.guias.value()?.data ?? [])
      .filter((guia) => Number(guia.activo ?? 1) === 1 || guia.id === actual);
  });

  readonly tourSeleccionado = computed(() => {
    const id = Number(this.objProgramado().tour_id);
    return (this.srvTour.todos.value()?.data ?? []).find((tour) => tour.id === id);
  });

  frmProgramado = form(this.objProgramado, (s) => {
    disabled(s, () => this.soloLectura);

    required(s.tour_id, { message: 'El tour es requerido' });
    validate(s.tour_id, (context: RootFieldContext<number>): ErrorCampo => {
      return Number(context.value()) >= 1 ? null : { kind: 'tour', message: 'Seleccione un tour' };
    });

    required(s.fecha, { message: 'La fecha es requerida' });
    required(s.hora, { message: 'La hora es requerida' });
    validate(s.hora, ({ value, valueOf }): ErrorCampo => {
      const fecha = valueOf(s.fecha);
      const hora = value();
      if (!this.esNuevo || fecha === '' || hora === '') {
        return null;
      }
      return new Date(`${fecha}T${hora}`) > new Date()
        ? null
        : { kind: 'futuro', message: 'La fecha y hora deben ser posteriores a este momento' };
    });

    required(s.cupo, { message: 'El cupo es requerido' });
    min(s.cupo, 1, { message: 'El cupo mínimo es 1 persona' });
    validate(s.cupo, (context: RootFieldContext<number>): ErrorCampo => {
      const cupo = Number(context.value());
      if (!Number.isInteger(cupo)) {
        return { kind: 'entero', message: 'El cupo debe ser un número entero' };
      }
      const maximo = Number(this.tourSeleccionado()?.cupo_maximo ?? 0);
      return maximo > 0 && cupo > maximo
        ? { kind: 'maximo', message: `El cupo no puede superar el máximo del tour (${maximo})` }
        : null;
    });

    required(s.estado, { message: 'El estado es requerido' });
  }, {
    submission: {
      action: async () => {
        if (this.soloLectura) {
          return;
        }
        const programado = this.objProgramado();
        this.dialogRef.close({
          tour_id: Number(programado.tour_id),
          guia_id: programado.guia_id === null ? null : Number(programado.guia_id),
          fecha_hora_inicio: `${programado.fecha} ${programado.hora.substring(0, 5)}:00`,
          cupo: Number(programado.cupo),
          estado: programado.estado,
        });
      }
    }
  });

  onTourChange(): void {
    const tour = this.tourSeleccionado();
    if (this.esNuevo && tour) {
      this.objProgramado.update((actual) => ({ ...actual, cupo: Number(tour.cupo_maximo) }));
    }
  }

  ngOnInit(): void {
    this.titulo = this.data.title;
    const programado = this.data.data;
    if (programado) {
      const [fecha, hora] = programado.fecha_hora_inicio.split(/[ T]/);
      this.objProgramado.set({
        tour_id: Number(programado.tour_id),
        guia_id: programado.guia_id === null || programado.guia_id === undefined ? null : Number(programado.guia_id),
        fecha: fecha,
        hora: (hora ?? '08:00').substring(0, 5),
        cupo: Number(programado.cupo),
        estado: programado.estado,
      });
    }
  }
}
