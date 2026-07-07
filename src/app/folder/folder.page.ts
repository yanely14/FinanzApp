import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonMenuButton, IonButton, IonIcon,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonItem, IonLabel, IonInput, IonList,
  IonSpinner, IonToast, IonNote,
  IonTabBar, IonTabButton,
  IonDatetime, IonDatetimeButton, IonModal
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { NetworkService } from '../services/network.service';
import { ExchangeRateService } from '../services/exchange-rate.service';
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
  notificationsOutline,
  calendarOutline,
  cameraOutline,
  trashOutline,
  locationOutline,
  playOutline,
  pauseOutline
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
    IonTabBar, IonTabButton,
    IonDatetime, IonDatetimeButton, IonModal
  ]
})
export class FolderPage implements OnInit, OnDestroy {

  // Variables del template original
  isOnline: boolean = true;
  tipoRed: string = 'Desconocida';
  datosPendientes: ElementoLocal[] = [];
  datosSincronizados: ElementoLocal[] = [];
  ultimaSync: string = '';
  nuevoElemento: string = '';

  // Variables de estado interno
  isSaving: boolean = false;
  showToast: boolean = false;
  toastMessage: string = '';
  toastColor: 'success' | 'warning' | 'danger' = 'success';

  // Variables de Bluetooth
  dispositivosBT: any[] = [];
  escaneandoBT: boolean = false;
  conectadoBT: boolean = false;
  dispositivoActivoId: string = '';

  // Variables del saludo / encabezado
  saludo: string = 'Hola, Joel';
  fechaTexto: string = '';
  iniciales: string = 'J';

  // NUEVO: Datos financieros para el diseño de Inicio
  balance: number = 0;
  tasaDolar: number | null = null;
  fotoRecibo: string | null = null;
  async tomarFotoRecibo(): Promise<void> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const { Capacitor } = await import('@capacitor/core');

      // En el navegador (computadora) se elige una foto existente, porque
      // la cámara en vivo del navegador tiene un bug conocido de Ionic.
      // En un teléfono real, esto sí abre la cámara de verdad.
      const origen = Capacitor.isNativePlatform() ? CameraSource.Camera : CameraSource.Photos;

      const foto = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: origen
      });

      this.fotoRecibo = foto.dataUrl ?? null;
    } catch (error) {
      console.error('Error al abrir la cámara:', error);
    }
  }
  quitarFotoRecibo(): void {
    this.fotoRecibo = null;
  }
  ubicacionGasto: { lat: number; lng: number } | null = null;
  obteniendoUbicacion: boolean = false;
  errorUbicacion: string = '';

  async obtenerUbicacion(): Promise<void> {
    this.obteniendoUbicacion = true;
    this.errorUbicacion = '';

    try {
      const { Geolocation } = await import('@capacitor/geolocation');

      const posicion = await Geolocation.getCurrentPosition();

      this.ubicacionGasto = {
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude
      };
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      this.errorUbicacion = 'No se pudo obtener tu ubicación. Revisa los permisos.';
    } finally {
      this.obteniendoUbicacion = false;
    }
  }

  quitarUbicacion(): void {
    this.ubicacionGasto = null;
  }

  reproduciendoTip: boolean = false;

  toggleTipAudio(): void {
    const audio = document.getElementById('audioTip') as HTMLAudioElement;
    if (!audio) return;

    if (this.reproduciendoTip) {
      audio.pause();
    } else {
      audio.play();
    }
    this.reproduciendoTip = !this.reproduciendoTip;
  }

  audioTerminado(): void {
    this.reproduciendoTip = false;
  }
  get urlMapa(): SafeResourceUrl {
    if (!this.ubicacionGasto) return '';
    const { lat, lng } = this.ubicacionGasto;
    const delta = 0.005;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
  cargandoTasa: boolean = true;
  totalIngresos: number = 0;
  totalGastos: number = 0;

  movimientos: { titulo: string; categoria: string; monto: number; tipo: string; emoji: string }[] = [];

  // NUEVO: control de qué pantalla se muestra
  vistaActiva: string = 'bienvenida'; // 'bienvenida', 'inicio', 'graficas', 'metas', 'alertas', 'agregarGasto'

  // NUEVO: datos del usuario guardado
  usuarioRegistrado: boolean = false;
  nombreUsuarioGuardado: string = '';
  edadUsuarioGuardada: string = '';

  nombreInput: string = '';
  edadInput: string = '';
  errorRegistro: string = '';

  async cargarUsuario(): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');

    const nombre = await Preferences.get({ key: 'usuario_nombre' });
    const edad = await Preferences.get({ key: 'usuario_edad' });

    if (nombre.value) {
      this.nombreUsuarioGuardado = nombre.value;
      this.edadUsuarioGuardada = edad.value ?? '';
      this.usuarioRegistrado = true;

      this.saludo = 'Hola, ' + nombre.value;
      this.iniciales = nombre.value.substring(0, 2).toUpperCase();
    }
  }

  async guardarUsuario(): Promise<void> {
    const edadTexto = String(this.edadInput).trim();

    if (!this.nombreInput.trim() || !edadTexto) {
      this.errorRegistro = 'Por favor completa nombre y edad';
      return;
    }

    const { Preferences } = await import('@capacitor/preferences');

    await Preferences.set({ key: 'usuario_nombre', value: this.nombreInput.trim() });
    await Preferences.set({ key: 'usuario_edad', value: edadTexto });

    this.nombreUsuarioGuardado = this.nombreInput.trim();
    this.edadUsuarioGuardada = edadTexto;
    this.usuarioRegistrado = true;
    this.errorRegistro = '';

    this.saludo = 'Hola, ' + this.nombreUsuarioGuardado;
    this.iniciales = this.nombreUsuarioGuardado.substring(0, 2).toUpperCase();
  }

  entrarApp(): void {
    this.vistaActiva = 'inicio';
  }

  cambiarVista(vista: string): void {
    this.vistaActiva = vista;
  }

  // NUEVO: formulario de agregar gasto
  categoriaSeleccionada: string = '';
  montoGasto: number | null = null;
  descripcionGasto: string = '';
  fechaGasto: string = new Date().toISOString();

  categorias = [
    { nombre: 'Comida', emoji: '🍔' },
    { nombre: 'Transporte', emoji: '🚗' },
    { nombre: 'Servicios', emoji: '🔊' },
    { nombre: 'Hogar', emoji: '🏠' },
    { nombre: 'Salud', emoji: '💊' },
    { nombre: 'Ocio', emoji: '🎡' },
    { nombre: 'Educación', emoji: '🎓' },
    { nombre: 'Otro', emoji: '⋯' },
  ];

  seleccionarCategoria(nombre: string): void {
    this.categoriaSeleccionada = nombre;
  }

  async guardarGasto(): Promise<void> {
    if (!this.montoGasto || !this.categoriaSeleccionada) return;

    const emojiCategoria = this.categorias.find(c => c.nombre === this.categoriaSeleccionada)?.emoji || '💸';

    const nuevoMovimiento = {
      titulo: this.descripcionGasto || this.categoriaSeleccionada,
      categoria: this.categoriaSeleccionada,
      monto: this.montoGasto,
      tipo: 'gasto',
      emoji: emojiCategoria
    };

    this.movimientos = [nuevoMovimiento, ...this.movimientos];
    this.totalGastos += this.montoGasto;
    this.balance -= this.montoGasto;

    await this.guardarDatosFinancieros();

    this.montoGasto = null;
    this.categoriaSeleccionada = '';
    this.descripcionGasto = '';

    this.vistaActiva = 'inicio';
  }

  private async guardarDatosFinancieros(): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');

    await Preferences.set({ key: 'finanzas_balance', value: String(this.balance) });
    await Preferences.set({ key: 'finanzas_ingresos', value: String(this.totalIngresos) });
    await Preferences.set({ key: 'finanzas_gastos', value: String(this.totalGastos) });
    await Preferences.set({ key: 'finanzas_movimientos', value: JSON.stringify(this.movimientos) });
  }

  private async cargarDatosFinancieros(): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');

    const balanceGuardado      = await Preferences.get({ key: 'finanzas_balance' });
    const ingresosGuardados    = await Preferences.get({ key: 'finanzas_ingresos' });
    const gastosGuardados      = await Preferences.get({ key: 'finanzas_gastos' });
    const movimientosGuardados = await Preferences.get({ key: 'finanzas_movimientos' });

    if (balanceGuardado.value)      this.balance = parseFloat(balanceGuardado.value);
    if (ingresosGuardados.value)    this.totalIngresos = parseFloat(ingresosGuardados.value);
    if (gastosGuardados.value)      this.totalGastos = parseFloat(gastosGuardados.value);
    if (movimientosGuardados.value) this.movimientos = JSON.parse(movimientosGuardados.value);
  }

  // NUEVO: datos para la pantalla de Gráficas
  datosMensuales = [
    { mes: 'Feb', ingresos: 28000, gastos: 14000 },
    { mes: 'Mar', ingresos: 32000, gastos: 19000 },
    { mes: 'Abr', ingresos: 35000, gastos: 20000 },
    { mes: 'May', ingresos: 35000, gastos: 16550 },
  ];

  gastosPorCategoria = [
    { nombre: 'Comida', monto: 6200 },
    { nombre: 'Transporte', monto: 3400 },
    { nombre: 'Servicios', monto: 2100 },
  ];

  get maxValorGrafica(): number {
    let valores: number[] = [];
    for (const d of this.datosMensuales) {
      valores.push(d.ingresos);
      valores.push(d.gastos);
    }
    return Math.max(...valores);
  }

  get maxGastoCategoria(): number {
    return Math.max(...this.gastosPorCategoria.map(g => g.monto));
  }

// NUEVO: datos para la pantalla de Metas
  metasAhorro = [
    {
      nombre: 'Comprar un carro',
      emoji: '🚗',
      fechaLimite: 'dic 2026',
      ahorrado: 68000,
      meta: 100000
    },
    {
      nombre: 'Fondo de emergencia',
      emoji: '🏠',
      fechaLimite: 'mar 2027',
      ahorrado: 20000,
      meta: 50000
    },
    {
      nombre: 'Vacaciones familiares',
      emoji: '✈️',
      fechaLimite: 'ago 2026',
      ahorrado: 4400,
      meta: 20000
    },
  ];

  porcentajeMeta(meta: any): number {
    return Math.round((meta.ahorrado / meta.meta) * 100);
  }

  // NUEVO: datos para la pantalla de Alertas
  alertasHoy = [
    {
      tipo: 'presupuesto',
      titulo: 'Presupuesto de comida superado',
      descripcion: 'Llevas RD$6,200 en comida. Tu límite mensual es RD$6,000. Superaste por RD$200.',
      hora: '10:30'
    },
    {
      tipo: 'meta',
      titulo: 'Meta en riesgo',
      descripcion: 'Al ritmo actual, no alcanzarás la meta de vacaciones para agosto. Ajusta tus gastos.',
      hora: '9:00'
    },
  ];

  alertasAyer = [
    {
      tipo: 'ahorro',
      titulo: 'Ahorro registrado',
      descripcion: 'Guardaste RD$2,000 para tu fondo de emergencia. Buen trabajo.',
      hora: '8:15'
    },
    {
      tipo: 'resumen',
      titulo: 'Resumen semanal listo',
      descripcion: 'Tu resumen de la semana del 18-24 de mayo ya está disponible en gráficas.',
      hora: '7:00'
    },
    {
      tipo: 'gasto',
      titulo: 'Gasto inusual detectado',
      descripcion: 'Registraste RD$3,500 en ocio, un 80% más que tu promedio habitual.',
      hora: '6:45'
    },
  ];

  private destroy$ = new Subject<void>();
  private readonly API_URL = 'https://api.tuservidor.com';
  private readonly STORAGE_KEY_PENDIENTES   = 'elementos_pendientes';
  private readonly STORAGE_KEY_SINCRONIZADOS = 'elementos_sincronizados';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private networkService: NetworkService,
    private exchangeRateService: ExchangeRateService,
    private offlineManager: OfflineManagerService,
    private bluetoothService: BluetoothService,
    private sanitizer: DomSanitizer
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
      'notifications-outline':   notificationsOutline,
      'calendar-outline':      calendarOutline,
      'camera-outline':          cameraOutline,
      'trash-outline':           trashOutline,
      'location-outline':        locationOutline,
      'play-outline':            playOutline,
      'pause-outline':           pauseOutline
    });

    const ahora = new Date();
    const texto = ahora.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    this.fechaTexto = texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  ngOnInit(): void {
    this.cargarUsuario().then(() => {
      if (this.usuarioRegistrado) {
        this.entrarApp();
      }
    });
    this.cargarDatosFinancieros();

    this.exchangeRateService.obtenerTasaDolar().subscribe({
  next: (tasa: number) => {
    this.tasaDolar = tasa;
    this.cargandoTasa = false;
  },
  error: () => {
    this.cargandoTasa = false;
  }
});
    this.watchNetworkStatus();
    this.watchOfflineQueue();
    this.cargarDatosLocales();

    window.addEventListener('connection-restored', this.onConnectionRestored);
    window.addEventListener('manual-sync',         this.onManualSync);
  }

  // MONITOREAR RED

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

  // CARGAR DATOS LOCALES

  private async cargarDatosLocales(): Promise<void> {
    const pendientes    = await this.offlineManager.getLocalData(this.STORAGE_KEY_PENDIENTES);
    const sincronizados = await this.offlineManager.getLocalData(this.STORAGE_KEY_SINCRONIZADOS);

    this.datosPendientes    = pendientes    ?? [];
    this.datosSincronizados = sincronizados ?? [];
  }

  // AGREGAR ELEMENTO — LÓGICA CONDICIONAL CENTRAL

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

  // CASO ONLINE

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

  // CASO OFFLINE

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

  // SINCRONIZACIÓN AUTOMÁTICA

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

  // MÉTODOS DE BLUETOOTH

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

  // HELPERS

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
