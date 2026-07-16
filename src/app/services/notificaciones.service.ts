import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const ID_RECORDATORIO_DIARIO = 999999;

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {

  private async estanActivadas(): Promise<boolean> {
    const guardado = await Preferences.get({ key: 'notificaciones_activas' });
    return guardado.value ? guardado.value === 'true' : false;
  }

  async pedirPermiso(): Promise<boolean> {
    try {
      const resultado = await LocalNotifications.requestPermissions();
      return resultado.display === 'granted';
    } catch (error) {
      console.error('Error al pedir permiso de notificaciones:', error);
      return false;
    }
  }

  async notificarMetaCumplida(nombreMeta: string): Promise<void> {
    if (!(await this.estanActivadas())) return;
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 100000),
          title: '🎉 ¡Meta cumplida!',
          body: `Alcanzaste tu meta de ahorro "${nombreMeta}". ¡Felicidades!`,
          schedule: { at: new Date(Date.now() + 1000) }
        }]
      });
    } catch (error) {
      console.error('Error al notificar meta cumplida:', error);
    }
  }

  async notificarPresupuestoSuperado(categoria: string, exceso: number): Promise<void> {
    if (!(await this.estanActivadas())) return;
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 100000),
          title: '⚠️ Presupuesto superado',
          body: `Superaste tu límite mensual de "${categoria}" por RD$ ${exceso.toLocaleString()}.`,
          schedule: { at: new Date(Date.now() + 1000) }
        }]
      });
    } catch (error) {
      console.error('Error al notificar presupuesto superado:', error);
    }
  }

  async programarRecordatorioDiario(): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: ID_RECORDATORIO_DIARIO }] });
      await LocalNotifications.schedule({
        notifications: [{
          id: ID_RECORDATORIO_DIARIO,
          title: '📒 Recordatorio de FinanzApp',
          body: 'No olvides registrar tus gastos e ingresos de hoy.',
          schedule: { on: { hour: 20, minute: 0 }, repeats: true }
        }]
      });
    } catch (error) {
      console.error('Error al programar recordatorio diario:', error);
    }
  }

  async cancelarRecordatorioDiario(): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: ID_RECORDATORIO_DIARIO }] });
    } catch (error) {
      console.error('Error al cancelar recordatorio diario:', error);
    }
  }
}
