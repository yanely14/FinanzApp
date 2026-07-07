import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonItem, IonSpinner,
  IonDatetime, IonDatetimeButton, IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, trashOutline, locationOutline, calendarOutline } from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-agregar-gasto',
  standalone: true,
  templateUrl: './agregar-gasto.page.html',
  styleUrls: ['./agregar-gasto.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonButton, IonIcon, IonInput, IonItem, IonSpinner,
    IonDatetime, IonDatetimeButton, IonModal
  ]
})
export class AgregarGastoPage {

  constructor(public finanzas: FinanzasService, private router: Router) {
    addIcons({
      'camera-outline': cameraOutline,
      'trash-outline': trashOutline,
      'location-outline': locationOutline,
      'calendar-outline': calendarOutline
    });
  }

  async guardar(): Promise<void> {
    await this.finanzas.guardarGasto();
    this.router.navigateByUrl('/tabs/inicio');
  }
}
