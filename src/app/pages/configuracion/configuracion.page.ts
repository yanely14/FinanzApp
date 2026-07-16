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
  logOutOutline, informationCircleOutline, moonOutline
} from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';
import { NotificacionesService } from '../../services/notificaciones.service';
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

  constructor(
    public finanzas: FinanzasService,
    private notificaciones: NotificacionesService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
      'person-circle-outline': personCircleOutline,
      'notifications-outline': notificationsOutline,
      'sync-outline': syncOutline,
      'log-out-outline': logOutOutline,
      'information-circle-outline': informationCircleOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    this.finanzas.nombreInput = this.finanzas.nombreUsuarioGuardado;
    this.finanzas.edadInput = this.finanzas.edadUsuarioGuardada;
    this.guardadoExitoso = false;

    const guardado = await Preferences.get({ key: 'notificaciones_activas' });
    this.notificacionesActivas = guardado.value === 'true';
  }

  async guardarPerfil(): Promise<void> {
    const ok = await this.finanzas.guardarUsuario();
    if (ok) {
      this.guardadoExitoso = true;
      setTimeout(() => (this.guardadoExitoso = false), 2500);
    }
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
