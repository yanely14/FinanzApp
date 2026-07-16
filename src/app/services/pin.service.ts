import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const CLAVE_PIN = 'seguridad_pin';
const CLAVE_PIN_ACTIVO = 'seguridad_pin_activo';

@Injectable({
  providedIn: 'root'
})
export class PinService {

  /** true una vez que el usuario desbloqueó la app en esta sesión */
  desbloqueado = false;

  async pinActivo(): Promise<boolean> {
    const activo = await Preferences.get({ key: CLAVE_PIN_ACTIVO });
    return activo.value === 'true';
  }

  async establecerPin(pin: string): Promise<void> {
    await Preferences.set({ key: CLAVE_PIN, value: pin });
    await Preferences.set({ key: CLAVE_PIN_ACTIVO, value: 'true' });
    this.desbloqueado = true;
  }

  async desactivarPin(): Promise<void> {
    await Preferences.remove({ key: CLAVE_PIN });
    await Preferences.set({ key: CLAVE_PIN_ACTIVO, value: 'false' });
    this.desbloqueado = true;
  }

  async validarPin(pin: string): Promise<boolean> {
    const guardado = await Preferences.get({ key: CLAVE_PIN });
    const esValido = !!guardado.value && guardado.value === pin;
    if (esValido) this.desbloqueado = true;
    return esValido;
  }
}
