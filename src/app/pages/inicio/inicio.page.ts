import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonList, IonItem, IonLabel, IonIcon,
  IonRefresher, IonRefresherContent, IonItemSliding, IonItemOptions, IonItemOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, cloudUploadOutline, timeOutline, documentTextOutline, trashOutline } from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonList, IonItem, IonLabel, IonIcon,
    IonRefresher, IonRefresherContent, IonItemSliding, IonItemOptions, IonItemOption
  ]
})
export class InicioPage {

  constructor(public finanzas: FinanzasService) {
    addIcons({
      'cloud-offline-outline': cloudOfflineOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'time-outline': timeOutline,
      'document-text-outline': documentTextOutline,
      'trash-outline': trashOutline
    });
  }

  async refrescar(event: any): Promise<void> {
    await this.finanzas.syncPendingOperations();
    event.target.complete();
  }

  borrarMovimiento(index: number): void {
    this.finanzas.eliminarMovimiento(index);
  }
}
