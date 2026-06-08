import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButtons,
  IonMenuButton,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonInput,
  IonButton
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  addOutline,
  cloudUploadOutline,
  cloudOfflineOutline,
  timeOutline,
  syncOutline,
  wifiOutline,
  documentTextOutline
} from 'ionicons/icons';

import { NetworkService } from '../services/network.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButtons,
    IonMenuButton,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonInput,
    IonButton
  ],
})
export class FolderPage implements OnInit {

  public folder!: string;
  isOnline: boolean = true;
  tipoRed: string = 'Desconocida';
  ultimaSync: string = '';
  nuevoElemento: string = '';
  datosPendientes: any[] = [];
  datosSincronizados: any[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private networkService: NetworkService
  ) {
    addIcons({
      addOutline,
      cloudUploadOutline,
      cloudOfflineOutline,
      timeOutline,
      syncOutline,
      wifiOutline,
      documentTextOutline
    });
  }

 ngOnInit() {

  this.folder =
    this.activatedRoute.snapshot.paramMap.get('id') as string;

  this.networkService
    .getNetworkStatus()
    .subscribe(status => {

      this.isOnline = status;

      if (status) {
        this.ultimaSync =
          new Date().toLocaleString();

        this.sincronizarPendientes();
      }
    });

  this.networkService
    .getNetworkType()
    .subscribe(tipo => {

      this.tipoRed = tipo;

    });

}

  agregarElemento() {
    if (!this.nuevoElemento.trim()) return;

    const nuevoItem = {
      titulo: this.nuevoElemento,
      hora: new Date().toLocaleTimeString(),
      sincronizado: this.isOnline
    };

    if (this.isOnline) {
      // Si hay conexión se guarda directo como sincronizado
      this.datosSincronizados.unshift(nuevoItem);
      this.ultimaSync = new Date().toLocaleString();
    } else {
      // Sin conexión se guarda como pendiente
      this.datosPendientes.unshift(nuevoItem);
    }

    this.nuevoElemento = '';
  }

  sincronizarPendientes() {
    if (this.datosPendientes.length === 0) return;

    // Al recuperar conexión mueve todos los pendientes a sincronizados
    this.datosPendientes.forEach(item => {
      this.datosSincronizados.unshift({ ...item, sincronizado: true });
    });

    this.datosPendientes = [];
    this.ultimaSync = new Date().toLocaleString();
  }
}