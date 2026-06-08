import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonItem,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonRouterOutlet,
  IonCard,
  IonCardContent
} from '@ionic/angular/standalone';

import { NetworkService } from './services/network.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,

    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonRouterOutlet,
    IonCard,
    IonCardContent
  ],
})
export class AppComponent {

  isOnline: boolean = true;

  constructor(private networkService: NetworkService) {

    // Escucha el estado de red en tiempo real
    this.networkService.getNetworkStatus().subscribe((status: boolean) => {
      this.isOnline = status;
    });

  }
}