import { TestBed } from '@angular/core/testing';
import { BluetoothService } from './bluetooth.service';
import { BleClient } from '@capacitor-community/bluetooth-le';

describe('BluetoothService', () => {
  let service: BluetoothService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BluetoothService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('debe inicializar el cliente Bluetooth sin errores', async () => {
    spyOn(BleClient, 'initialize').and.returnValue(Promise.resolve());
    await service.inicializar();
    expect(BleClient.initialize).toHaveBeenCalled();
  });

  it('debe retornar true si el Bluetooth está habilitado', async () => {
    spyOn(BleClient, 'isEnabled').and.returnValue(Promise.resolve(true));
    const resultado = await service.estaHabilitado();
    expect(resultado).toBeTrue();
  });

  it('debe actualizar la lista de dispositivos correctamente', () => {
    const dispositivosPrueba = [
      { deviceId: '00:11:22', nombre: 'Audífonos', rssi: -60 }
    ];
    service.actualizarDispositivos(dispositivosPrueba);

    service.getDispositivos().subscribe(dispositivos => {
      expect(dispositivos).toEqual(dispositivosPrueba);
    });
  });

  it('debe actualizar el estado de conexión correctamente', () => {
    service.actualizarEstadoConexion(true);

    service.getEstadoConexion().subscribe(estado => {
      expect(estado).toBeTrue();
    });
  });

  it('debe llamar a BleClient.connect al conectar un dispositivo', async () => {
    spyOn(BleClient, 'connect').and.returnValue(Promise.resolve());
    await service.conectarDispositivo('00:11:22');
    expect(BleClient.connect).toHaveBeenCalled();
  });

  it('debe llamar a BleClient.disconnect al desconectar', async () => {
    spyOn(BleClient, 'disconnect').and.returnValue(Promise.resolve());
    await service.desconectar('00:11:22');
    expect(BleClient.disconnect).toHaveBeenCalled();
  });
});