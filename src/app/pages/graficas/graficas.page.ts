import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton } from '@ionic/angular/standalone';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-graficas',
  standalone: true,
  templateUrl: './graficas.page.html',
  styleUrls: ['./graficas.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton]
})
export class GraficasPage {
  constructor(public finanzas: FinanzasService) {}
}
