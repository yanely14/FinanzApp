import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline } from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-metas',
  standalone: true,
  templateUrl: './metas.page.html',
  styleUrls: ['./metas.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonIcon]
})
export class MetasPage {
  constructor(public finanzas: FinanzasService) {
    addIcons({ 'add-circle-outline': addCircleOutline });
  }
}
