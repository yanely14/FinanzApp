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
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonButton,
  IonLabel,
  IonToast
} from '@ionic/angular/standalone';

import { NetworkService } from './services/network.service';
import { BluetoothService } from './services/bluetooth.service';
import { FinanzasService } from './services/finanzas.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  wifiOutline,
  timeOutline,
  bluetoothOutline,
  searchOutline,
  syncOutline,
  chevronDownOutline,
  settingsOutline
} from 'ionicons/icons';

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
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonIcon,
    IonButton,
    IonLabel,
    IonToast
  ],
})
export class AppComponent {

  mostrarConectividad: boolean = false;

  toggleConectividad(): void {
    this.mostrarConectividad = !this.mostrarConectividad;
  }
  isOnline: boolean = true;
  tipoRed: string = 'Desconocida';
  cambiosPendientes: number = 0;

  dispositivosBT: any[] = [];
  escaneandoBT: boolean = false;
  conectadoBT: boolean = false;
  dispositivoActivoId: string = '';
  errorBT: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    public finanzas: FinanzasService,
    private networkService: NetworkService,
    private bluetoothService: BluetoothService
  ) {
    addIcons({
      'wifi-outline': wifiOutline,
      'time-outline': timeOutline,
      'bluetooth-outline': bluetoothOutline,
      'search-outline': searchOutline,
      'sync-outline': syncOutline,
      'chevron-down-outline': chevronDownOutline,
      'settings-outline': settingsOutline
    });

    this.networkService.getNetworkStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: boolean) => {
        this.isOnline = status;
      });

    this.networkService.getNetworkType()
      .pipe(takeUntil(this.destroy$))
      .subscribe((tipo: string) => {
        this.tipoRed = tipo;
      });
  }

  async escanearBT(): Promise<void> {
    this.escaneandoBT = true;
    this.dispositivosBT = [];
    this.errorBT = null;

    this.bluetoothService.getDispositivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(dispositivos => {
        this.dispositivosBT = dispositivos;
      });

    this.bluetoothService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorBT = error;
      });

    await this.bluetoothService.escanearDispositivos();

    setTimeout(() => {
      this.escaneandoBT = false;
    }, 5000);
  }

  async conectarBT(deviceId: string): Promise<void> {
    await this.bluetoothService.conectarDispositivo(deviceId);
    this.dispositivoActivoId = deviceId;

    this.bluetoothService.getEstadoConexion()
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => {
        this.conectadoBT = estado;
      });
  }
}
