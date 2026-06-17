import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonMenuButton, IonButton, IonIcon,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonInput, IonList,
  IonSpinner, IonToast, IonNote,
  IonTabBar, IonTabButton
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { NetworkService } from '../services/network.service';
import { OfflineManagerService, OfflineQueueStatus } from '../services/offline-manager.service';
import { BluetoothService } from '../services/bluetooth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  wifiOutline,
  cloudOfflineOutline,
  cloudUploadOutline,
  timeOutline,
  syncOutline,
  documentTextOutline,
  addOutline,
  bluetoothOutline,
  searchOutline,
  chevronForwardOutline,
  closeOutline,
  homeOutline,
  addCircleOutline,
  barChartOutline,
  flagOutline,
  notificationsOutline
} from 'ionicons/icons';

export interface ElementoLocal {
  id: string;
  titulo: string;
  hora: string;
  timestamp: number;
  sincronizado: boolean;
}

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonMenuButton, IonButton, IonIcon,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonItem, IonLabel, IonInput, IonList,
    IonSpinner, IonToast, IonNote,
    IonTabBar, IonTabButton
  ]
})
export class FolderPage implements OnInit, OnDestroy {

  // ── Variables del template original ──────────────────────────────────────────
  isOnline: boolean = true;
  tipoRed: string = 'Desconocida';
  datosPendientes: ElementoLocal[] = [];
  datosSincronizados: ElementoLocal[] = [];
  ultimaSync: string = '';
  nuevoElemento: string = '';

  // ── Variables de estado interno ───────────────────────────────────────────────
  isSaving: boolean = false;
  showToast: boolean = false;
  toastMessage: string = '';
  toastColor: 'success' | 'warning' | 'danger' = 'success';

  // ── Variables de Bluetooth ─────────────────────────────────────────────
  dispositivosBT: any[] = [];
  escaneandoBT: boolean = false;
  conectadoBT: boolean = false;
  dispositivoActivoId: string = '';

  // ── Variables del saludo / encabezado ────────────────────────────────────
  saludo: string = 'Hola, Joel';
  fechaTexto: string = '';
  iniciales: string = 'J';

  private destroy$ = new Subject<void>();
  private readonly API_URL = 'https://api.tuservidor.com'; // 🔁 Cambia por tu API real
  private readonly STORAGE_KEY_PENDIENTES   = 'elementos_pendientes';
  private readonly STORAGE_KEY_SINCRONIZADOS = 'elementos_sincronizados';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private networkService: NetworkService,
    private offlineManager: OfflineManagerService,
    private bluetoothService: BluetoothService
  ) {
    addIcons({
      'wifi-outline':            wifiOutline,
      'cloud-offline-outline':   cloudOfflineOutline,
      'cloud-upload-outline':    cloudUploadOutline,
      'time-outline':            timeOutline,
      'sync-outline':            syncOutline,
      'document-text-outline':  documentTextOutline,
      'add-outline':             addOutline,
      'bluetooth-outline':       bluetoothOutline,
      'search-outline':          searchOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'close-outline':           closeOutline,
      'home-outline':            homeOutline,
      'add-circle-outline':      addCircleOutline,
      'bar-chart-outline':       barChartOutline,
      'flag-outline':            flagOutline,
      'notifications-outline':   notificationsOutline
    });

    const ahora = new Date();
    const texto = ahora.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    this.fechaTexto = texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  ngOnInit(): void {
    this.watchNetworkStatus();
    this.watchOfflineQueue();
    this.cargarDatosLocales();

    window.addEventListener('connection-restored', this.onConnectionRestored);
    window.addEventListener('manual-sync',         this.onManualSync);
  }

  // ─── MONITOREAR RED ───────────────────────────────────────────────────────────

  private watchNetworkStatus(): void {
    this.networkService.getNetworkStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((online: boolean) => {
        this.isOnline = online;
        if (online) {
          this.syncPendingOperations();
        }
      });
  }

  private watchOfflineQueue(): void {
    this.offlineManager.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: OfflineQueueStatus) => {
        if (status.lastSyncTime) {
          const fecha = new Date(status.lastSyncTime);
          this.ultimaSync = fecha.toLocaleTimeString('es-DO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
      });
  }

  // ─── CARGAR DATOS LOCALES ─────────────────────────────────────────────────────

  private async cargarDatosLocales(): Promise<void> {
    const pendientes    = await this.offlineManager.getLocalData(this.STORAGE_KEY_PENDIENTES);
    const sincronizados = await this.offlineManager.getLocalData(this.STORAGE_KEY_SINCRONIZADOS);

    this.datosPendientes    = pendientes    ?? [];
    this.datosSincronizados = sincronizados ?? [];
  }

  // ─── AGREGAR ELEMENTO — LÓGICA CONDICIONAL CENTRAL ───────────────────────────

  async agregarElemento(): Promise<void> {
    if (!this.nuevoElemento.trim()) return;

    this.isSaving = true;

    const ahora = new Date();
    const elemento: ElementoLocal = {
      id:           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      titulo:       this.nuevoElemento.trim(),
      hora:         ahora.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
      timestamp:    ahora.getTime(),
      sincronizado: false
    };

    if (this.isOnline) {
      await this.guardarOnline(elemento);
    } else {
      await this.guardarOffline(elemento);
    }

    this.nuevoElemento = '';
    this.isSaving = false;
  }

  // ─── CASO ONLINE ─────────────────────────────────────────────────────────────

  private async guardarOnline(elemento: ElementoLocal): Promise<void> {
    try {
      await this.http.post(`${this.API_URL}/elementos`, elemento).toPromise();

      elemento.sincronizado = true;
      this.datosSincronizados = [elemento, ...this.datosSincronizados];
      await this.offlineManager.saveLocalData(
        this.STORAGE_KEY_SINCRONIZADOS,
        this.datosSincronizados
      );

      this.showToastMsg('✅ Guardado en el servidor', 'success');
    } catch (error) {
      console.error('Error al enviar al servidor, guardando offline:', error);
      await this.guardarOffline(elemento);
    }
  }

  // ─── CASO OFFLINE ────────────────────────────────────────────────────────────

  private async guardarOffline(elemento: ElementoLocal): Promise<void> {
    try {
      this.datosPendientes = [elemento, ...this.datosPendientes];

      await this.offlineManager.saveLocalData(
        this.STORAGE_KEY_PENDIENTES,
        this.datosPendientes
      );

      await this.offlineManager.addPendingOperation(
        'POST',
        '/elementos',
        elemento
      );

      this.showToastMsg(
        `📱 Guardado localmente. Se sincronizará al recuperar conexión.`,
        'warning'
      );
    } catch (error) {
      console.error('Error al guardar offline:', error);
      this.showToastMsg('❌ Error al guardar localmente', 'danger');
    }
  }

  // ─── SINCRONIZACIÓN AUTOMÁTICA ────────────────────────────────────────────────

  private onConnectionRestored = (): void => { this.syncPendingOperations(); };
  private onManualSync         = (): void => { this.syncPendingOperations(); };

  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline) return;

    const pending = await this.offlineManager.getPendingOperations();
    if (pending.length === 0) return;

    this.offlineManager.setSyncing(true);
    console.log(`🔄 Sincronizando ${pending.length} operación(es)...`);

    for (const op of pending) {
      try {
        const url = `${this.API_URL}${op.endpoint}`;

        switch (op.type) {
          case 'POST':  await this.http.post(url,  op.payload).toPromise(); break;
          case 'PUT':   await this.http.put(url,   op.payload).toPromise(); break;
          case 'DELETE':await this.http.delete(url).toPromise();            break;
          case 'PATCH': await this.http.patch(url, op.payload).toPromise(); break;
        }

        const elemento = this.datosPendientes.find(d => d.id === op.payload.id);
        if (elemento) {
          elemento.sincronizado = true;
          this.datosSincronizados = [elemento, ...this.datosSincronizados];
          this.datosPendientes    = this.datosPendientes.filter(d => d.id !== op.payload.id);
        }

        await this.offlineManager.removePendingOperation(op.id);
        console.log(`✅ Sincronizada: ${op.type} ${op.endpoint}`);

      } catch (error) {
        await this.offlineManager.updateRetryCount(op.id, String(error));
        console.error(`❌ Error sincronizando ${op.id}:`, error);
      }
    }

    await this.offlineManager.saveLocalData(this.STORAGE_KEY_PENDIENTES,    this.datosPendientes);
    await this.offlineManager.saveLocalData(this.STORAGE_KEY_SINCRONIZADOS, this.datosSincronizados);

    this.offlineManager.updateLastSyncTime();
    this.offlineManager.setSyncing(false);

    if (this.datosPendientes.length === 0) {
      this.showToastMsg('✅ Todos los datos sincronizados', 'success');
    }
  }

  // ─── MÉTODOS DE BLUETOOTH ──────────────────────────────────────────────

  async escanearBT(): Promise<void> {
    this.escaneandoBT = true;
    this.dispositivosBT = [];

    this.bluetoothService.getDispositivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(dispositivos => {
        this.dispositivosBT = dispositivos;
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

  async desconectarBT(): Promise<void> {
    if (this.dispositivoActivoId) {
      await this.bluetoothService.desconectar(this.dispositivoActivoId);
      this.dispositivoActivoId = '';
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private showToastMsg(message: string, color: 'success' | 'warning' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor   = color;
    this.showToast    = true;
    setTimeout(() => this.showToast = false, 4000);
  }

  ngOnDestroy(): void {
    window.removeEventListener('connection-restored', this.onConnectionRestored);
    window.removeEventListener('manual-sync',         this.onManualSync);
    this.destroy$.next();
    this.destroy$.complete();
  }
}