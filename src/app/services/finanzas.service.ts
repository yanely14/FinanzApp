import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { NetworkService } from './network.service';
import { ExchangeRateService } from './exchange-rate.service';
import { OfflineManagerService, OfflineQueueStatus } from './offline-manager.service';
import { NotificacionesService } from './notificaciones.service';

export interface ElementoLocal {
  id: string;
  titulo: string;
  hora: string;
  timestamp: number;
  sincronizado: boolean;
}

export interface ActividadItem {
  tipo: string;
  titulo: string;
  descripcion: string;
  timestamp: number;
  hora: string;
}

@Injectable({ providedIn: 'root' })
export class FinanzasService {

  // ---------- USUARIO ----------
  usuarioRegistrado = false;
  nombreUsuarioGuardado = '';
  edadUsuarioGuardada = '';
  nombreInput = '';
  edadInput = '';
  errorRegistro = '';

  saludo = 'Hola';
  fechaTexto = '';
  iniciales = '';

  // ---------- RED ----------
  isOnline = true;
  tipoRed = 'Desconocida';

  // ---------- TASA DEL DÓLAR ----------
  tasaDolar: number | null = null;
  cargandoTasa = true;

  // ---------- FINANZAS ----------
  balance = 0;
  totalIngresos = 0;
  totalGastos = 0;
  movimientos: { titulo: string; categoria: string; monto: number; tipo: string; emoji: string; timestamp: number; ubicacion?: { lat: number; lng: number } | null; foto?: string | null }[] = [];

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

  categoriasIngreso = [
    { nombre: 'Salario', emoji: '💰' },
    { nombre: 'Freelance', emoji: '💻' },
    { nombre: 'Regalo', emoji: '🎁' },
    { nombre: 'Inversión', emoji: '📈' },
    { nombre: 'Venta', emoji: '🏷️' },
    { nombre: 'Otro', emoji: '⋯' },
  ];

  tipoMovimientoNuevo: 'gasto' | 'ingreso' = 'gasto';

  get categoriasActivas() {
    return this.tipoMovimientoNuevo === 'ingreso' ? this.categoriasIngreso : this.categorias;
  }

  categoriaSeleccionada = '';
  montoGasto: number | null = null;
  descripcionGasto = '';
  fechaGasto: string = new Date().toISOString();
  errorGasto = '';

  // ---------- RECIBO (CÁMARA) ----------
  fotoRecibo: string | null = null;

  // ---------- UBICACIÓN ----------
  ubicacionGasto: { lat: number; lng: number } | null = null;
  obteniendoUbicacion = false;
  errorUbicacion = '';

  get balanceUSD(): number | null {
    if (!this.tasaDolar || this.tasaDolar <= 0) return null;
    return this.balance / this.tasaDolar;
  }

  // ---------- PRESUPUESTOS ----------
  presupuestos: { categoria: string; limite: number }[] = [];

  obtenerLimitePresupuesto(categoria: string): number | null {
    return this.presupuestos.find(p => p.categoria === categoria)?.limite ?? null;
  }

  gastadoEnCategoriaEsteMes(categoria: string): number {
    return this.movimientosDelMesActual
      .filter(m => m.tipo === 'gasto' && m.categoria === categoria)
      .reduce((total, m) => total + m.monto, 0);
  }

  estadoPresupuesto(categoria: string): { limite: number; gastado: number; sobrepasado: boolean } | null {
    const limite = this.obtenerLimitePresupuesto(categoria);
    if (!limite || limite <= 0) return null;

    const gastado = this.gastadoEnCategoriaEsteMes(categoria);
    return { limite, gastado, sobrepasado: gastado >= limite };
  }

  async establecerPresupuesto(categoria: string, limite: number): Promise<void> {
    const existente = this.presupuestos.find(p => p.categoria === categoria);

    if (!limite || limite <= 0) {
      this.presupuestos = this.presupuestos.filter(p => p.categoria !== categoria);
    } else if (existente) {
      existente.limite = limite;
    } else {
      this.presupuestos = [...this.presupuestos, { categoria, limite }];
    }

    await this.guardarDatosFinancieros();
  }

  private async verificarPresupuesto(categoria: string): Promise<void> {
    const presupuesto = this.presupuestos.find(p => p.categoria === categoria);
    if (!presupuesto || presupuesto.limite <= 0) return;

    const gastosCategoria = this.movimientosDelMesActual.filter(m => m.tipo === 'gasto' && m.categoria === categoria);
    const totalGastado = gastosCategoria.reduce((total, m) => total + m.monto, 0);
    if (totalGastado <= presupuesto.limite) return;

    // Solo notificar la vez que se cruza el límite, no en cada gasto posterior
    const gastadoAntes = totalGastado - (gastosCategoria[0]?.monto ?? 0);
    if (gastadoAntes > presupuesto.limite) return;

    const exceso = totalGastado - presupuesto.limite;
    await this.notificaciones.notificarPresupuestoSuperado(categoria, exceso);
    this.registrarActividad(
      'presupuesto',
      `Presupuesto de ${categoria} superado`,
      `Llevas RD$ ${totalGastado.toLocaleString()} en ${categoria}. Tu límite mensual es RD$ ${presupuesto.limite.toLocaleString()}. Superaste por RD$ ${exceso.toLocaleString()}.`
    );
    this.showToastMsg(
      `⚠️ Superaste tu presupuesto de ${categoria} por RD$ ${exceso.toLocaleString()}`,
      'warning'
    );
  }

  // ---------- METAS ----------
  metasAhorro: { nombre: string; emoji: string; fechaLimite: string; ahorrado: number; meta: number }[] = [];

  sugerenciasMeta = [
    { nombre: 'Comprar un carro', emoji: '🚗' },
    { nombre: 'Fondo de emergencia', emoji: '🏠' },
    { nombre: 'Vacaciones', emoji: '✈️' },
    { nombre: 'Nuevo teléfono', emoji: '📱' },
    { nombre: 'Educación', emoji: '🎓' },
    { nombre: 'Boda', emoji: '💍' },
  ];

  // ---------- ALERTAS (registro real de actividad del usuario) ----------
  registroActividad: ActividadItem[] = [];
  reproduciendoTip = false;

  // ---------- OFFLINE ----------
  datosPendientes: ElementoLocal[] = [];
  datosSincronizados: ElementoLocal[] = [];
  ultimaSync = '';
  showToast = false;
  toastMessage = '';
  toastColor: 'success' | 'warning' | 'danger' = 'success';

  private readonly API_URL = 'https://jsonplaceholder.typicode.com/posts';
  private readonly STORAGE_KEY_PENDIENTES = 'elementos_pendientes';
  private readonly STORAGE_KEY_SINCRONIZADOS = 'elementos_sincronizados';

  constructor(
    private http: HttpClient,
    private networkService: NetworkService,
    private exchangeRateService: ExchangeRateService,
    private offlineManager: OfflineManagerService,
    private sanitizer: DomSanitizer,
    private notificaciones: NotificacionesService
  ) {
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    const ahora = new Date();
    const texto = ahora.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    this.fechaTexto = texto.charAt(0).toUpperCase() + texto.slice(1);

    await this.cargarUsuario();
    await this.cargarDatosFinancieros();
    await this.cargarDatosLocales();

    this.exchangeRateService.obtenerTasaDolar().subscribe({
      next: (tasa: number) => { this.tasaDolar = tasa; this.cargandoTasa = false; },
      error: () => { this.cargandoTasa = false; }
    });

    this.networkService.getNetworkStatus().subscribe((online: boolean) => {
      this.isOnline = online;
      if (online) this.syncPendingOperations();
    });

    this.offlineManager.status$.subscribe((status: OfflineQueueStatus) => {
      if (status.lastSyncTime) {
        const fecha = new Date(status.lastSyncTime);
        this.ultimaSync = fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    });

    window.addEventListener('connection-restored', () => this.syncPendingOperations());
    window.addEventListener('manual-sync', () => this.syncPendingOperations());
  }

  // ---------- USUARIO ----------
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

  async guardarUsuario(): Promise<boolean> {
    const edadTexto = String(this.edadInput).trim();
    if (!this.nombreInput.trim() || !edadTexto) {
      this.errorRegistro = 'Por favor completa nombre y edad';
      return false;
    }

    const eraRegistrado = this.usuarioRegistrado;
    const nombreAnterior = this.nombreUsuarioGuardado;
    const edadAnterior = this.edadUsuarioGuardada;

    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'usuario_nombre', value: this.nombreInput.trim() });
    await Preferences.set({ key: 'usuario_edad', value: edadTexto });

    this.nombreUsuarioGuardado = this.nombreInput.trim();
    this.edadUsuarioGuardada = edadTexto;
    this.usuarioRegistrado = true;
    this.errorRegistro = '';
    this.saludo = 'Hola, ' + this.nombreUsuarioGuardado;
    this.iniciales = this.nombreUsuarioGuardado.substring(0, 2).toUpperCase();

    if (eraRegistrado) {
      this.registrarActividad(
        'perfil',
        'Perfil actualizado',
        `Cambiaste tu nombre de "${nombreAnterior}" a "${this.nombreUsuarioGuardado}" y tu edad de ${edadAnterior} a ${this.edadUsuarioGuardada} años.`
      );
    }

    return true;
  }

  // ---------- CERRAR SESIÓN ----------
  // ---------- EXPORTAR / RESPALDAR DATOS ----------
  exportarDatos(): string {
    const respaldo = {
      exportadoEl: new Date().toISOString(),
      usuario: this.nombreUsuarioGuardado,
      balance: this.balance,
      totalIngresos: this.totalIngresos,
      totalGastos: this.totalGastos,
      movimientos: this.movimientos,
      metas: this.metasAhorro,
      presupuestos: this.presupuestos
    };
    return JSON.stringify(respaldo, null, 2);
  }

  async cerrarSesion(): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');

    await Preferences.remove({ key: 'usuario_nombre' });
    await Preferences.remove({ key: 'usuario_edad' });

    await Preferences.remove({ key: 'finanzas_balance' });
    await Preferences.remove({ key: 'finanzas_ingresos' });
    await Preferences.remove({ key: 'finanzas_gastos' });
    await Preferences.remove({ key: 'finanzas_movimientos' });
    await Preferences.remove({ key: 'finanzas_metas' });
    await Preferences.remove({ key: 'finanzas_actividad' });
    await Preferences.remove({ key: 'finanzas_presupuestos' });

    await this.offlineManager.removeLocalData(this.STORAGE_KEY_PENDIENTES);
    await this.offlineManager.removeLocalData(this.STORAGE_KEY_SINCRONIZADOS);
    await this.offlineManager.clearQueue();

    this.usuarioRegistrado = false;
    this.nombreUsuarioGuardado = '';
    this.edadUsuarioGuardada = '';
    this.nombreInput = '';
    this.edadInput = '';
    this.saludo = 'Hola';
    this.iniciales = '';

    this.balance = 0;
    this.totalIngresos = 0;
    this.totalGastos = 0;
    this.movimientos = [];
    this.metasAhorro = [];
    this.registroActividad = [];
    this.presupuestos = [];
    this.datosPendientes = [];
    this.datosSincronizados = [];
    this.ultimaSync = '';
  }

  // ---------- CÁMARA ----------
  async tomarFotoRecibo(): Promise<void> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const { Capacitor } = await import('@capacitor/core');
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

  // ---------- UBICACIÓN ----------
  async obtenerUbicacion(): Promise<void> {
    this.obteniendoUbicacion = true;
    this.errorUbicacion = '';
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const posicion = await Geolocation.getCurrentPosition();
      this.ubicacionGasto = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
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

  get urlMapa(): SafeResourceUrl | string {
    if (!this.ubicacionGasto) return '';
    const { lat, lng } = this.ubicacionGasto;
    const delta = 0.005;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // ---------- AUDIO ----------
  toggleTipAudio(): void {
    const audio = document.getElementById('audioTip') as HTMLAudioElement;
    if (!audio) return;
    if (this.reproduciendoTip) audio.pause(); else audio.play();
    this.reproduciendoTip = !this.reproduciendoTip;
  }

  audioTerminado(): void {
    this.reproduciendoTip = false;
  }

  // ---------- CATEGORÍA ----------
  seleccionarCategoria(nombre: string): void {
    this.categoriaSeleccionada = nombre;
  }

  // ---------- GRÁFICAS ----------
  private get movimientosDelMesActual() {
    const ahora = new Date();
    return this.movimientos.filter(m => {
      const fecha = new Date(m.timestamp);
      return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    });
  }

  get ingresosMesActual(): number {
    return this.movimientosDelMesActual
      .filter(m => m.tipo === 'ingreso')
      .reduce((total, m) => total + m.monto, 0);
  }

  get gastosMesActual(): number {
    return this.movimientosDelMesActual
      .filter(m => m.tipo === 'gasto')
      .reduce((total, m) => total + m.monto, 0);
  }

  get maxValorGrafica(): number {
    return Math.max(this.ingresosMesActual, this.gastosMesActual, 1);
  }

  get gastosPorCategoria(): { nombre: string; monto: number }[] {
    const categorias = new Map<string, number>();
    for (const m of this.movimientosDelMesActual) {
      if (m.tipo !== 'gasto') continue;
      categorias.set(m.categoria, (categorias.get(m.categoria) ?? 0) + m.monto);
    }
    return Array.from(categorias, ([nombre, monto]) => ({ nombre, monto }));
  }

  get maxGastoCategoria(): number {
    if (this.gastosPorCategoria.length === 0) return 1;
    return Math.max(...this.gastosPorCategoria.map(g => g.monto));
  }

  porcentajeMeta(meta: any): number {
    return Math.round((meta.ahorrado / meta.meta) * 100);
  }

  agregarMeta(nombre: string, emoji: string, fechaLimite: string, montoMeta: number): void {
    this.metasAhorro = [...this.metasAhorro, { nombre, emoji, fechaLimite, ahorrado: 0, meta: montoMeta }];
    this.registrarActividad('meta', 'Meta creada', `Creaste la meta "${nombre}" ${emoji} por RD$ ${montoMeta.toLocaleString()}, con fecha límite ${fechaLimite}.`);
    this.guardarDatosFinancieros();
  }

  abonarAMeta(meta: { nombre: string; ahorrado: number; meta: number }, monto: number): boolean {
    if (!monto || monto <= 0) return false;
    if (monto > this.balance) return false;
    const yaEstabaCumplida = meta.ahorrado >= meta.meta;
    meta.ahorrado += monto;
    this.balance -= monto;
    this.registrarActividad('abono', 'Abono a meta', `Abonaste RD$ ${monto.toLocaleString()} a la meta "${meta.nombre}".`);
    this.guardarDatosFinancieros();

    if (!yaEstabaCumplida && meta.ahorrado >= meta.meta) {
      this.notificaciones.notificarMetaCumplida(meta.nombre);
    }

    return true;
  }

  editarMeta(metaOriginal: { nombre: string; emoji: string; fechaLimite: string; meta: number }, nombre: string, emoji: string, fechaLimite: string, montoMeta: number): void {
    const nombreAnterior = metaOriginal.nombre;
    metaOriginal.nombre = nombre;
    metaOriginal.emoji = emoji;
    metaOriginal.fechaLimite = fechaLimite;
    metaOriginal.meta = montoMeta;
    this.registrarActividad('meta', 'Meta editada', `Editaste la meta "${nombreAnterior}": ahora es "${nombre}", meta RD$ ${montoMeta.toLocaleString()}, fecha límite ${fechaLimite}.`);
    this.guardarDatosFinancieros();
  }

  eliminarMeta(meta: { nombre: string }): void {
    this.metasAhorro = this.metasAhorro.filter(m => m !== meta);
    this.registrarActividad('meta', 'Meta eliminada', `Eliminaste la meta "${meta.nombre}".`);
    this.guardarDatosFinancieros();
  }

  // ---------- REGISTRO DE ACTIVIDAD (para la página de Alertas) ----------
  registrarActividad(tipo: string, titulo: string, descripcion: string): void {
    const ahora = new Date();
    this.registroActividad = [{
      tipo,
      titulo,
      descripcion,
      timestamp: ahora.getTime(),
      hora: ahora.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    }, ...this.registroActividad];
    this.guardarDatosFinancieros();
  }

  get gruposActividad(): { etiqueta: string; items: ActividadItem[] }[] {
    const grupos: { etiqueta: string; items: ActividadItem[] }[] = [];
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);

    for (const item of this.registroActividad) {
      const fecha = new Date(item.timestamp); fecha.setHours(0, 0, 0, 0);
      let etiqueta: string;
      if (fecha.getTime() === hoy.getTime()) etiqueta = 'Hoy';
      else if (fecha.getTime() === ayer.getTime()) etiqueta = 'Ayer';
      else etiqueta = new Date(item.timestamp).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });

      let grupo = grupos.find(g => g.etiqueta === etiqueta);
      if (!grupo) {
        grupo = { etiqueta, items: [] };
        grupos.push(grupo);
      }
      grupo.items.push(item);
    }
    return grupos;
  }

  // ---------- GUARDAR GASTO (con offline real, reciclando "pendientes") ----------
  async guardarGasto(): Promise<boolean> {
    if (!this.categoriaSeleccionada) {
      this.errorGasto = 'Selecciona una categoría.';
      return false;
    }
    if (!this.montoGasto || this.montoGasto <= 0) {
      this.errorGasto = 'Ingresa un monto válido, mayor a 0.';
      return false;
    }
    this.errorGasto = '';

    const emojiCategoria = this.categoriasActivas.find(c => c.nombre === this.categoriaSeleccionada)?.emoji || '💸';
    const ahora = new Date();

    const nuevoMovimiento: any = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      titulo: this.descripcionGasto || this.categoriaSeleccionada,
      categoria: this.categoriaSeleccionada,
      monto: this.montoGasto,
      tipo: this.tipoMovimientoNuevo,
      emoji: emojiCategoria,
      hora: ahora.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
      timestamp: ahora.getTime(),
      sincronizado: false,
      ubicacion: this.ubicacionGasto,
      foto: this.fotoRecibo
    };

    this.movimientos = [nuevoMovimiento, ...this.movimientos];

   if (this.tipoMovimientoNuevo === 'ingreso') {
      this.totalIngresos += this.montoGasto;
      this.balance += this.montoGasto;
    } else {
      this.totalGastos += this.montoGasto;
      this.balance -= this.montoGasto;
    }

    const esIngreso = this.tipoMovimientoNuevo === 'ingreso';
    this.registrarActividad(
      esIngreso ? 'ingreso' : 'gasto',
      esIngreso ? 'Ingreso registrado' : 'Gasto registrado',
      `${esIngreso ? 'Recibiste' : 'Gastaste'} RD$ ${this.montoGasto.toLocaleString()} en "${this.categoriaSeleccionada}"${this.descripcionGasto ? ' (' + this.descripcionGasto + ')' : ''}.`
    );

    await this.guardarDatosFinancieros();

    if (this.isOnline) {
      await this.guardarGastoOnline(nuevoMovimiento);
    } else {
      await this.guardarGastoOffline(nuevoMovimiento);
    }

    if (!esIngreso) {
      await this.verificarPresupuesto(this.categoriaSeleccionada);
    }

    this.montoGasto = null;
    this.categoriaSeleccionada = '';
    this.descripcionGasto = '';
    this.fotoRecibo = null;
    this.ubicacionGasto = null;

    return true;
  }

  private async guardarGastoOnline(elemento: ElementoLocal): Promise<void> {
    try {
      await firstValueFrom(this.http.post(this.API_URL, elemento));

      elemento.sincronizado = true;
      this.datosSincronizados = [elemento, ...this.datosSincronizados];
      await this.offlineManager.saveLocalData(this.STORAGE_KEY_SINCRONIZADOS, this.datosSincronizados);
      this.showToastMsg('✅ Gasto guardado y sincronizado', 'success');
    } catch (error) {
      console.error('Error al sincronizar con el servidor, guardando offline:', error);
      await this.guardarGastoOffline(elemento);
    }
  }

  private async guardarGastoOffline(elemento: ElementoLocal): Promise<void> {
    try {
      this.datosPendientes = [elemento, ...this.datosPendientes];
      await this.offlineManager.saveLocalData(this.STORAGE_KEY_PENDIENTES, this.datosPendientes);
      await this.offlineManager.addPendingOperation('POST', '/gastos', elemento);
      this.showToastMsg('📱 Gasto guardado localmente. Se sincronizará al recuperar conexión.', 'warning');
    } catch (error) {
      console.error('Error al guardar gasto offline:', error);
      this.showToastMsg('❌ Error al guardar el gasto', 'danger');
    }
  }

  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline) return;
    const pending = await this.offlineManager.getPendingOperations();
    if (pending.length === 0) return;

    this.offlineManager.setSyncing(true);

    for (const op of pending) {
      try {
        await firstValueFrom(this.http.post(this.API_URL, op.payload));

        const elemento = this.datosPendientes.find((d: any) => d.id === op.payload.id);
        if (elemento) {
          elemento.sincronizado = true;
          this.datosSincronizados = [elemento, ...this.datosSincronizados];
          this.datosPendientes = this.datosPendientes.filter((d: any) => d.id !== op.payload.id);
        }

        await this.offlineManager.removePendingOperation(op.id);
      } catch (error) {
        await this.offlineManager.updateRetryCount(op.id, String(error));
      }
    }

    await this.offlineManager.saveLocalData(this.STORAGE_KEY_PENDIENTES, this.datosPendientes);
    await this.offlineManager.saveLocalData(this.STORAGE_KEY_SINCRONIZADOS, this.datosSincronizados);
    this.offlineManager.updateLastSyncTime();
    this.offlineManager.setSyncing(false);

    if (this.datosPendientes.length === 0) {
      this.showToastMsg('✅ Todos los gastos sincronizados', 'success');
    }
  }

  // ---------- GESTO: DESLIZAR PARA BORRAR ----------
  eliminarMovimiento(index: number): void {
    const mov = this.movimientos[index];
    if (mov.tipo === 'gasto') {
      this.totalGastos -= mov.monto;
      this.balance += mov.monto;
    } else {
      this.totalIngresos -= mov.monto;
      this.balance -= mov.monto;
    }
    this.movimientos = this.movimientos.filter((_, i) => i !== index);
    this.guardarDatosFinancieros();
  }

  editarMovimiento(index: number, nuevoMonto: number, nuevaDescripcion: string): boolean {
    const mov = this.movimientos[index];
    if (!mov || !nuevoMonto || nuevoMonto <= 0) return false;

    const diferencia = nuevoMonto - mov.monto;
    if (mov.tipo === 'gasto') {
      this.totalGastos += diferencia;
      this.balance -= diferencia;
    } else {
      this.totalIngresos += diferencia;
      this.balance += diferencia;
    }

    const movimientoActualizado = {
      ...mov,
      monto: nuevoMonto,
      titulo: nuevaDescripcion.trim() || mov.categoria
    };
    this.movimientos = this.movimientos.map((m, i) => i === index ? movimientoActualizado : m);

    this.registrarActividad(
      'gasto',
      'Movimiento editado',
      `Editaste "${mov.categoria}" a RD$ ${nuevoMonto.toLocaleString()}.`
    );

    this.guardarDatosFinancieros();

    if (mov.tipo === 'gasto') {
      this.verificarPresupuesto(mov.categoria);
    }

    return true;
  }

  private async guardarDatosFinancieros(): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'finanzas_balance', value: String(this.balance) });
    await Preferences.set({ key: 'finanzas_ingresos', value: String(this.totalIngresos) });
    await Preferences.set({ key: 'finanzas_gastos', value: String(this.totalGastos) });
    await Preferences.set({ key: 'finanzas_movimientos', value: JSON.stringify(this.movimientos) });
    await Preferences.set({ key: 'finanzas_metas', value: JSON.stringify(this.metasAhorro) });
    await Preferences.set({ key: 'finanzas_actividad', value: JSON.stringify(this.registroActividad) });
    await Preferences.set({ key: 'finanzas_presupuestos', value: JSON.stringify(this.presupuestos) });
  }

  private async cargarDatosFinancieros(): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    const balanceGuardado = await Preferences.get({ key: 'finanzas_balance' });
    const ingresosGuardados = await Preferences.get({ key: 'finanzas_ingresos' });
    const gastosGuardados = await Preferences.get({ key: 'finanzas_gastos' });
    const movimientosGuardados = await Preferences.get({ key: 'finanzas_movimientos' });
    const metasGuardadas = await Preferences.get({ key: 'finanzas_metas' });
    const actividadGuardada = await Preferences.get({ key: 'finanzas_actividad' });
    const presupuestosGuardados = await Preferences.get({ key: 'finanzas_presupuestos' });

    if (balanceGuardado.value) this.balance = parseFloat(balanceGuardado.value);
    if (ingresosGuardados.value) this.totalIngresos = parseFloat(ingresosGuardados.value);
    if (gastosGuardados.value) this.totalGastos = parseFloat(gastosGuardados.value);
    if (movimientosGuardados.value) this.movimientos = JSON.parse(movimientosGuardados.value);
    if (metasGuardadas.value) this.metasAhorro = JSON.parse(metasGuardadas.value);
    if (actividadGuardada.value) this.registroActividad = JSON.parse(actividadGuardada.value);
    if (presupuestosGuardados.value) this.presupuestos = JSON.parse(presupuestosGuardados.value);
  }

  private async cargarDatosLocales(): Promise<void> {
    const pendientes = await this.offlineManager.getLocalData(this.STORAGE_KEY_PENDIENTES);
    const sincronizados = await this.offlineManager.getLocalData(this.STORAGE_KEY_SINCRONIZADOS);
    this.datosPendientes = pendientes ?? [];
    this.datosSincronizados = sincronizados ?? [];
  }

  private showToastMsg(message: string, color: 'success' | 'warning' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 4000);
  }
}
