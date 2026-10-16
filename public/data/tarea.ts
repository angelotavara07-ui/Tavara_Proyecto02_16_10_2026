
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Tarea {
  id: number;
  curso: string;
  titulo: string;
  fechaEntrega: string;
  estadoAcademico: 'Pendiente' | 'En progreso' | 'Completada';
}

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private http = inject(HttpClient);

  obtenerTareas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>('/data/tareas.json');
  }
}
