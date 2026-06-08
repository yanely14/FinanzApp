import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  private onlineStatus = new BehaviorSubject<boolean>(true);

  private networkType =
    new BehaviorSubject<string>('Desconocida');

  constructor() {
    this.initializeNetwork();
  }

  async initializeNetwork() {

    const status = await Network.getStatus();

    this.onlineStatus.next(status.connected);
    this.networkType.next(status.connectionType);

    Network.addListener('networkStatusChange', status => {

      this.onlineStatus.next(status.connected);
      this.networkType.next(status.connectionType);

    });
  }

  getNetworkStatus() {
    return this.onlineStatus.asObservable();
  }

  getNetworkType() {
    return this.networkType.asObservable();
  }
}