
import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarea, TareaService } from './services/tarea';
import { EntregaLocal, StorageService } from './services/storage';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private tareaService = inject(TareaService);
  private storage = inject(StorageService);

  tareas: Tarea[] = [];
  busqueda = '';
  cursoSeleccionado = '';
  cursos: string[] = [];
  cargando = true;
  error = '';

  tareaSeleccionada: Tarea | null = null;
  comentario = '';
  mensajeFormulario = '';
  tipoMensaje: 'exito' | 'error' | '' = '';

  entregas: EntregaLocal[] = [];
  pendientes = 0;
  guardando = false;
  cargandoEntregas = false;
  entregaSeleccionada: EntregaLocal | null = null;

  constructor() {
    this.cargarTareas();
    this.cargarEntregas();
  }

  cargarTareas() {
    this.cargando = true;
    this.error = '';

    this.tareaService.obtenerTareas().subscribe({
      next: (tareas: Tarea[]) => {
        this.tareas = tareas;
        this.cursos = [...new Set(tareas.map(tarea => tarea.curso))];
        this.cargando = false;
      },
      error: (error: unknown) => {
        console.error('Error al cargar las tareas:', error);
        this.error = 'No se pudieron cargar las tareas. Comprueba el archivo JSON.';
        this.cargando = false;
      }
    });
  }

  get tareasFiltradas(): Tarea[] {
    return this.tareas.filter(tarea => {
      const coincideTitulo = tarea.titulo
        .toLowerCase()
        .includes(this.busqueda.trim().toLowerCase());

      const coincideCurso =
        this.cursoSeleccionado === '' ||
        tarea.curso === this.cursoSeleccionado;

      return coincideTitulo && coincideCurso;
    });
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.cursoSeleccionado = '';
  }

  seleccionarTarea(tarea: Tarea) {
    this.tareaSeleccionada = tarea;
    this.comentario = '';
    this.mensajeFormulario = '';
    this.tipoMensaje = '';
  }

  async guardarEntrega() {
    if (!this.tareaSeleccionada) {
      this.mensajeFormulario = 'Selecciona una tarea antes de continuar.';
      this.tipoMensaje = 'error';
      return;
    }

    if (!this.comentario.trim()) {
      this.mensajeFormulario = 'Escribe un comentario para tu entrega.';
      this.tipoMensaje = 'error';
      return;
    }

    this.guardando = true;
    this.mensajeFormulario = '';

    try {
      await this.storage.guardarEntregaLocal({
        tareaId: this.tareaSeleccionada.id,
        curso: this.tareaSeleccionada.curso,
        tituloTarea: this.tareaSeleccionada.titulo,
        comentario: this.comentario.trim()
      });

      this.mensajeFormulario =
        'Entrega guardada localmente con estado PENDIENTE.';
      this.tipoMensaje = 'exito';

      this.comentario = '';
      this.tareaSeleccionada = null;

      await this.cargarEntregas();
    } catch (error) {
      console.error('Error al guardar la entrega:', error);
      this.mensajeFormulario =
        'No se pudo guardar la entrega. Tu comentario sigue en el formulario; inténtalo nuevamente.';
      this.tipoMensaje = 'error';
    } finally {
      this.guardando = false;
    }
  }

  async cargarEntregas() {
    this.cargandoEntregas = true;

    try {
      this.entregas = await this.storage.listarEntregas();
      this.pendientes = await this.storage.contarPendientes();
    } catch (error) {
      console.error('Error al consultar las entregas:', error);
      this.mensajeFormulario =
        'No se pudo leer el historial local. Comprueba el almacenamiento del navegador.';
      this.tipoMensaje = 'error';
    } finally {
      this.cargandoEntregas = false;
    }
  }

  async verDetalleEntrega(entrega: EntregaLocal) {
    if (entrega.id === undefined) {
      return;
    }

    try {
      this.entregaSeleccionada =
        await this.storage.obtenerEntrega(entrega.id) ?? null;
    } catch (error) {
      console.error('Error al consultar el detalle:', error);
      this.mensajeFormulario = 'No se pudo abrir el detalle de la entrega.';
      this.tipoMensaje = 'error';
    }
  }

  async eliminarEntrega(entrega: EntregaLocal) {
    if (entrega.id === undefined) {
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la entrega de "${entrega.tituloTarea}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await this.storage.eliminarEntrega(entrega.id);

      if (this.entregaSeleccionada?.id === entrega.id) {
        this.entregaSeleccionada = null;
      }

      await this.cargarEntregas();
    } catch (error) {
      console.error('Error al eliminar la entrega:', error);
      this.mensajeFormulario =
        'No se pudo eliminar la entrega. El registro podría seguir guardado.';
      this.tipoMensaje = 'error';
    }
  }
}
