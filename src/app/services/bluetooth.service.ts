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

  // Escanea dispositivos Bluetooth cercanos durante 5 segundos
 private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  async escanearDispositivos(): Promise<void> {
    try {
      const dispositivos: any[] = [];

      await BleClient.requestLEScan({}, (result) => {
        // Cada vez que encuentra un dispositivo lo agrega a la lista
        // Se filtra por nombre para evitar mostrar dispositivos desconocidos
        if (result.device.name) {
          const existe = dispositivos.find(d => d.deviceId === result.device.deviceId);
          if (!existe) {
            dispositivos.push({
              deviceId: result.device.deviceId,
              nombre: result.device.name || 'Dispositivo desconocido',
              rssi: result.rssi // Intensidad de señal
            });
            this.actualizarDispositivos([...dispositivos]);
          }
        }
      });

      // Detiene el escaneo después de 5 segundos
      setTimeout(async () => {
        await BleClient.stopLEScan();
        console.log(`Escaneo completado. Encontrados: ${dispositivos.length}`);
      }, 5000);

    } catch (error) {
      console.error('Error durante el escaneo:', error);
        this.errorSubject.next('No se pudo escanear. Verifica que el Bluetooth esté activado y que estés usando la app en un teléfono, no en el navegador.');
    }
  }

  // Conecta con un dispositivo específico por su ID
  async conectarDispositivo(deviceId: string): Promise<void> {
    try {
      await BleClient.connect(deviceId, () => {
        // Callback que se ejecuta si la conexión se pierde inesperadamente
        console.log('Conexión perdida con:', deviceId);
        this.actualizarEstadoConexion(false);
      });

      this.actualizarEstadoConexion(true);
      console.log('Conectado exitosamente a:', deviceId);

    } catch (error) {
      console.error('Error al conectar:', error);
      this.actualizarEstadoConexion(false);
    }
  }

  // Desconecta del dispositivo activo
  async desconectar(deviceId: string): Promise<void> {
    try {
      await BleClient.disconnect(deviceId);
      this.actualizarEstadoConexion(false);
      console.log('Desconectado de:', deviceId);
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  }
}
