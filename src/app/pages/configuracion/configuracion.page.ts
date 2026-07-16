import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonItem, IonToggle, IonLabel, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personCircleOutline, notificationsOutline, syncOutline,
  logOutOutline, informationCircleOutline, moonOutline, downloadOutline
} from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { PinService } from '../../services/pin.service';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonButton, IonIcon, IonInput, IonItem, IonToggle, IonLabel
  ]
})
export class ConfiguracionPage {

  notificacionesActivas = true;
  guardadoExitoso = false;
  presupuestosInput: { nombre: string; emoji: string; limite: number | null }[] = [];
  pinActivo = false;

  constructor(
    public finanzas: FinanzasService,
    private notificaciones: NotificacionesService,
    private pinService: PinService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
      'person-circle-outline': personCircleOutline,
      'notifications-outline': notificationsOutline,
      'sync-outline': syncOutline,
      'log-out-outline': logOutOutline,
      'information-circle-outline': informationCircleOutline,
      'download-outline': downloadOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    this.finanzas.nombreInput = this.finanzas.nombreUsuarioGuardado;
    this.finanzas.edadInput = this.finanzas.edadUsuarioGuardada;
    this.guardadoExitoso = false;

    const guardado = await Preferences.get({ key: 'notificaciones_activas' });
    this.notificacionesActivas = guardado.value === 'true';

    this.presupuestosInput = this.finanzas.categorias.map(cat => ({
      nombre: cat.nombre,
      emoji: cat.emoji,
      limite: this.finanzas.obtenerLimitePresupuesto(cat.nombre)
    }));

    this.pinActivo = await this.pinService.pinActivo();
  }

  async onTogglePin(): Promise<void> {
    if (this.pinActivo) {
      await this.pedirNuevoPin();
    } else {
      await this.pinService.desactivarPin();
    }
  }

  async cambiarPin(): Promise<void> {
    await this.pedirNuevoPin();
  }

  private async pedirNuevoPin(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Establecer PIN',
      message: 'Ingresa un PIN de 4 a 6 dígitos para proteger el acceso a la app.',
      inputs: [
        { name: 'pin', type: 'password', placeholder: 'PIN', attributes: { inputmode: 'numeric', maxlength: 6 } }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => { this.pinActivo = false; }
        },
        {
          text: 'Guardar',
          handler: async (datos) => {
            const pin = String(datos.pin ?? '').trim();
            if (pin.length < 4) {
              this.pinActivo = false;
              return false;
            }
            await this.pinService.establecerPin(pin);
            this.pinActivo = true;
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async guardarPresupuesto(categoria: string, limite: number | null): Promise<void> {
    await this.finanzas.establecerPresupuesto(categoria, limite ?? 0);
  }

  async guardarPerfil(): Promise<void> {
    const ok = await this.finanzas.guardarUsuario();
    if (ok) {
      this.guardadoExitoso = true;
      setTimeout(() => (this.guardadoExitoso = false), 2500);
    }
  }

  async exportarDatos(): Promise<void> {
    const json = this.finanzas.exportarDatos();
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: 'Respaldo de FinanzApp',
      text: json,
      dialogTitle: 'Compartir respaldo de tus datos financieros'
    });
  }

  async cerrarSesion(): Promise<void> {
    const alert = await this.alertController.create({
      header: '⚠️ Cerrar sesión',
      message: 'Esto borrará tu perfil y TODOS tus datos financieros (balance, ingresos, gastos y movimientos). Esta acción no se puede deshacer. ¿Deseas continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sí, borrar todo',
          role: 'destructive',
          handler: async () => {
            await this.finanzas.cerrarSesion();
            await this.pinService.desactivarPin();
            this.router.navigateByUrl('/bienvenida');
          }
        }
      ]
    });

    await alert.present();
  }
async onToggleNotificaciones(): Promise<void> {
    await Preferences.set({ key: 'notificaciones_activas', value: String(this.notificacionesActivas) });

    if (this.notificacionesActivas) {
      const concedido = await this.notificaciones.pedirPermiso();
      if (concedido) {
        await this.notificaciones.programarRecordatorioDiario();
      } else {
        this.notificacionesActivas = false;
        await Preferences.set({ key: 'notificaciones_activas', value: 'false' });
      }
    } else {
      await this.notificaciones.cancelarRecordatorioDiario();
    }
  }

}
