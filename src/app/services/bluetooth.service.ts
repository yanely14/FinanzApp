import { Injectable } from '@angular/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  // Lista de dispositivos encontrados en el escaneo
  private dispositivosSubject = new BehaviorSubject<any[]>([]);
  dispositivos$ = this.dispositivosSubject.asObservable();

  // Estado de conexión activa
  private conectadoSubject = new BehaviorSubject<boolean>(false);
  conectado$ = this.conectadoSubject.asObservable();

  constructor() {
    this.inicializar();
  }

  // Inicializa el cliente Bluetooth del dispositivo
  async inicializar(): Promise<void> {
    try {
      await BleClient.initialize();
      console.log('Bluetooth inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar Bluetooth:', error);
    }
  }

  // Retorna si el Bluetooth está habilitado en el dispositivo
  async estaHabilitado(): Promise<boolean> {
    return await BleClient.isEnabled();
  }

  // Expone la lista actual de dispositivos encontrados
  getDispositivos() {
    return this.dispositivosSubject.asObservable();
  }

  // Expone el estado de conexión
  getEstadoConexion() {
    return this.conectadoSubject.asObservable();
  }

  // Permite que otras partes del servicio actualicen la lista de dispositivos
  actualizarDispositivos(dispositivos: any[]): void {
    this.dispositivosSubject.next(dispositivos);
  }

  // Permite actualizar el estado de conexión desde fuera
  actualizarEstadoConexion(estado: boolean): void {
    this.conectadoSubject.next(estado);
  }
}