import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { playOutline, pauseOutline } from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-alertas',
  standalone: true,
  templateUrl: './alertas.page.html',
  styleUrls: ['./alertas.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonIcon]
})
export class AlertasPage {
  constructor(public finanzas: FinanzasService) {
    addIcons({ 'play-outline': playOutline, 'pause-outline': pauseOutline });
  }
}
