
import { Injectable } from '@angular/core';

export type EstadoSincronizacion =
  | 'PENDIENTE'
  | 'SINCRONIZADO'
  | 'ERROR';

export interface EntregaLocal {
  id?: number;
  tareaId: number;
  curso: string;
  tituloTarea: string;
  comentario: string;
  fechaRegistro: string;
  estadoSincronizacion: EstadoSincronizacion;
  intentosSincronizacion: number;
  ultimoError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbName = 'senatiTaskHubDB';
  private storeName = 'entregas';

  private abrirDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const solicitud = indexedDB.open(this.dbName, 1);

      solicitud.onupgradeneeded = () => {
        const db = solicitud.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      solicitud.onsuccess = () => {
        resolve(solicitud.result);
      };

      solicitud.onerror = () => {
        reject(solicitud.error);
      };
    });
  }

  async guardarEntregaLocal(
    entrega: Omit<
      EntregaLocal,
      'id' | 'fechaRegistro' | 'estadoSincronizacion' | 'intentosSincronizacion'
    >
  ): Promise<void> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(this.storeName, 'readwrite');

      const registro: EntregaLocal = {
        ...entrega,
        fechaRegistro: new Date().toISOString(),
        estadoSincronizacion: 'PENDIENTE',
        intentosSincronizacion: 0
      };

      transaccion.objectStore(this.storeName).add(registro);

      transaccion.oncomplete = () => {
        db.close();
        resolve();
      };

      transaccion.onerror = () => {
        db.close();
        reject(transaccion.error);
      };

      transaccion.onabort = () => {
        db.close();
        reject(transaccion.error);
      };
    });
  }

  async listarEntregas(): Promise<EntregaLocal[]> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(this.storeName, 'readonly');
      const solicitud = transaccion.objectStore(this.storeName).getAll();

      solicitud.onsuccess = () => {
        const entregas = solicitud.result as EntregaLocal[];

        entregas.sort(
          (a, b) =>
            new Date(b.fechaRegistro).getTime() -
            new Date(a.fechaRegistro).getTime()
        );

        resolve(entregas);
      };

      solicitud.onerror = () => {
        reject(solicitud.error);
      };

      transaccion.oncomplete = () => {
        db.close();
      };

      transaccion.onerror = () => {
        db.close();
        reject(transaccion.error);
      };
    });
  }

  async obtenerEntrega(id: number): Promise<EntregaLocal | undefined> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(this.storeName, 'readonly');
      const solicitud = transaccion.objectStore(this.storeName).get(id);

      solicitud.onsuccess = () => {
        resolve(solicitud.result as EntregaLocal | undefined);
      };

      solicitud.onerror = () => {
        reject(solicitud.error);
      };

      transaccion.oncomplete = () => {
        db.close();
      };

      transaccion.onerror = () => {
        db.close();
        reject(transaccion.error);
      };
    });
  }

  async eliminarEntrega(id: number): Promise<void> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction(this.storeName, 'readwrite');

      transaccion.objectStore(this.storeName).delete(id);

      transaccion.oncomplete = () => {
        db.close();
        resolve();
      };

      transaccion.onerror = () => {
        db.close();
        reject(transaccion.error);
      };

      transaccion.onabort = () => {
        db.close();
        reject(transaccion.error);
      };
    });
  }

  async contarPendientes(): Promise<number> {
    const entregas = await this.listarEntregas();

    return entregas.filter(
      entrega => entrega.estadoSincronizacion === 'PENDIENTE'
    ).length;
  }
}
