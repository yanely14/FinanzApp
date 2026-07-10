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
  modoOscuro = true;
  guardadoExitoso = false;

  constructor(
    public finanzas: FinanzasService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
      'person-circle-outline': personCircleOutline,
      'notifications-outline': notificationsOutline,
      'sync-outline': syncOutline,
      'log-out-outline': logOutOutline,
      'information-circle-outline': informationCircleOutline,
      'moon-outline': moonOutline
    });
  }

  ionViewWillEnter(): void {
    this.finanzas.nombreInput = this.finanzas.nombreUsuarioGuardado;
    this.finanzas.edadInput = this.finanzas.edadUsuarioGuardada;
    this.guardadoExitoso = false;
  }

  async guardarPerfil(): Promise<void> {
    const ok = await this.finanzas.guardarUsuario();
    if (ok) {
      this.guardadoExitoso = true;
      setTimeout(() => (this.guardadoExitoso = false), 2500);
    }
  }

  sincronizarAhora(): void {
    this.finanzas.syncPendingOperations();
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
}
