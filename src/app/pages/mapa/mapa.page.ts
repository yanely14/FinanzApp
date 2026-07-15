import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type * as Leaflet from 'leaflet';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonButton, IonIcon,
  IonSearchbar, IonList, IonItem, IonLabel, IonChip, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline, navigateOutline, shareSocialOutline, searchOutline, locateOutline,
  radioButtonOnOutline, radioButtonOffOutline
} from 'ionicons/icons';
import { MapaService, Coordenadas, LugarBuscado, PuntoInteres, CategoriaPOI } from '../../services/mapa.service';
import { NetworkService } from '../../services/network.service';

/** Centro por defecto cuando aún no se conoce la ubicación del usuario (Santo Domingo, RD) */
const CENTRO_INICIAL: Coordenadas = { lat: 18.4861, lng: -69.9312 };

@Component({
  selector: 'app-mapa',
  standalone: true,
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonButton, IonIcon,
    IonSearchbar, IonList, IonItem, IonLabel, IonChip, IonSpinner
  ]
})
export class MapaPage implements AfterViewInit, OnDestroy {

  categorias = this.mapaService.categorias;
  categoriaActiva: CategoriaPOI | null = null;

  textoBusqueda = '';
  resultadosBusqueda: LugarBuscado[] = [];
  puntosInteres: PuntoInteres[] = [];

  obteniendoUbicacion = false;
  buscandoLugar = false;
  buscandoPOI = false;
  siguiendoEnVivo = false;

  precisionMetros: number | null = null;
  errorMensaje = '';
  isOnline = true;

  private L!: typeof Leaflet;
  private mapa!: Leaflet.Map;
  private marcadorUsuario: Leaflet.Marker | null = null;
  private circuloPrecision: Leaflet.Circle | null = null;
  private marcadorBusqueda: Leaflet.Marker | null = null;
  private marcadoresPOI: Leaflet.Marker[] = [];

  constructor(private mapaService: MapaService, private networkService: NetworkService) {
    addIcons({
      'location-outline': locationOutline,
      'navigate-outline': navigateOutline,
      'share-social-outline': shareSocialOutline,
      'search-outline': searchOutline,
      'locate-outline': locateOutline,
      'radio-button-on-outline': radioButtonOnOutline,
      'radio-button-off-outline': radioButtonOffOutline
    });
    this.networkService.getNetworkStatus().subscribe(online => this.isOnline = online);
  }

  async ngAfterViewInit(): Promise<void> {
    const leafletModule: any = await import('leaflet');
    this.L = leafletModule.default ?? leafletModule;
    try {
      this.inicializarMapa();
    } catch (error) {
      this.errorMensaje = 'No se pudo cargar el mapa. Intenta reabrir la app.';
      console.error('Error al inicializar el mapa Leaflet:', error);
      return;
    }
    await this.usarMiUbicacion();
  }

  ngOnDestroy(): void {
    this.mapaService.detenerSeguimiento();
    this.mapa?.remove();
  }

  // ---------- MAPA ----------
  private inicializarMapa(): void {
    this.mapa = this.L.map('mapa-contenedor', {
      center: [CENTRO_INICIAL.lat, CENTRO_INICIAL.lng],
      zoom: 14,
      zoomControl: true
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.mapa);
  }

  private iconoDivo(html: string, clase: string, tamano: number): Leaflet.DivIcon {
    return this.L.divIcon({
      html,
      className: clase,
      iconSize: [tamano, tamano],
      iconAnchor: [tamano / 2, tamano / 2]
    });
  }

  // ---------- UBICACIÓN GPS ----------
  async usarMiUbicacion(): Promise<void> {
    this.obteniendoUbicacion = true;
    this.errorMensaje = '';
    try {
      const coords = await this.mapaService.obtenerUbicacionActual();
      this.precisionMetros = coords.precisionMetros ?? null;
      this.mapa.setView([coords.lat, coords.lng], 15);
      this.pintarMarcadorUsuario(coords);
    } catch (error: any) {
      this.errorMensaje = error?.message ?? 'No se pudo obtener tu ubicación. Revisa los permisos.';
    } finally {
      this.obteniendoUbicacion = false;
    }
  }

  private pintarMarcadorUsuario(coords: Coordenadas): void {
    const posicion: Leaflet.LatLngExpression = [coords.lat, coords.lng];

    if (!this.marcadorUsuario) {
      this.marcadorUsuario = this.L.marker(posicion, {
        icon: this.iconoDivo('<div class="punto-usuario"></div>', 'marcador-usuario', 18)
      }).addTo(this.mapa).bindPopup('Tú estás aquí');
    } else {
      this.marcadorUsuario.setLatLng(posicion);
    }

    if (coords.precisionMetros) {
      if (!this.circuloPrecision) {
        this.circuloPrecision = this.L.circle(posicion, {
          radius: coords.precisionMetros,
          color: '#6c5ce7', fillColor: '#6c5ce7', fillOpacity: 0.12, weight: 1
        }).addTo(this.mapa);
      } else {
        this.circuloPrecision.setLatLng(posicion).setRadius(coords.precisionMetros);
      }
    }
  }

  async alternarSeguimientoEnVivo(): Promise<void> {
    if (this.siguiendoEnVivo) {
      await this.mapaService.detenerSeguimiento();
      this.siguiendoEnVivo = false;
      return;
    }

    this.errorMensaje = '';
    try {
      await this.mapaService.iniciarSeguimiento(coords => {
        this.precisionMetros = coords.precisionMetros ?? null;
        this.pintarMarcadorUsuario(coords);
      });
      this.siguiendoEnVivo = true;
    } catch (error: any) {
      this.errorMensaje = error?.message ?? 'No se pudo iniciar el seguimiento en tiempo real.';
    }
  }

  async compartir(): Promise<void> {
    const centro = this.marcadorUsuario?.getLatLng();
    const coords: Coordenadas = centro
      ? { lat: centro.lat, lng: centro.lng }
      : CENTRO_INICIAL;

    try {
      await this.mapaService.compartirUbicacion(coords);
    } catch {
      // el usuario canceló la hoja de compartir; no es un error a mostrar
    }
  }

  // ---------- BÚSQUEDA DE LUGARES ----------
  async onBuscarInput(event: any): Promise<void> {
    const texto = event.detail.value ?? '';
    this.textoBusqueda = texto;
    if (texto.trim().length < 3) {
      this.resultadosBusqueda = [];
      return;
    }

    this.buscandoLugar = true;
    this.errorMensaje = '';
    try {
      this.resultadosBusqueda = await this.mapaService.buscarLugar(texto);
    } catch {
      this.errorMensaje = 'No se pudo buscar el lugar. Verifica tu conexión a internet.';
    } finally {
      this.buscandoLugar = false;
    }
  }

  seleccionarResultado(lugar: LugarBuscado): void {
    this.resultadosBusqueda = [];
    this.textoBusqueda = lugar.nombre;
    this.mapa.setView([lugar.lat, lugar.lng], 16);

    if (this.marcadorBusqueda) {
      this.marcadorBusqueda.setLatLng([lugar.lat, lugar.lng]);
    } else {
      this.marcadorBusqueda = this.L.marker([lugar.lat, lugar.lng], {
        icon: this.iconoDivo('📍', 'marcador-busqueda', 28)
      }).addTo(this.mapa);
    }
    this.marcadorBusqueda.bindPopup(lugar.nombre).openPopup();
  }

  // ---------- PUNTOS DE INTERÉS ----------
  async seleccionarCategoria(categoria: CategoriaPOI): Promise<void> {
    if (this.categoriaActiva?.id === categoria.id) {
      this.categoriaActiva = null;
      this.limpiarMarcadoresPOI();
      return;
    }

    this.categoriaActiva = categoria;
    this.buscandoPOI = true;
    this.errorMensaje = '';
    this.limpiarMarcadoresPOI();

    try {
      const centro = this.mapa.getCenter();
      this.puntosInteres = await this.mapaService.buscarPuntosInteres(
        { lat: centro.lat, lng: centro.lng },
        categoria
      );
      this.pintarMarcadoresPOI(categoria);
    } catch (error: any) {
      const status = error?.status;
      if (status === 429) {
        this.errorMensaje = 'Demasiadas búsquedas seguidas. Espera unos segundos e intenta de nuevo.';
      } else if (status === 504 || status === 0) {
        this.errorMensaje = 'El servidor de mapas está saturado. Intenta de nuevo en un momento.';
      } else {
        this.errorMensaje = 'No se pudieron cargar los lugares cercanos. Verifica tu conexión a internet.';
      }
      this.puntosInteres = [];
    } finally {
      this.buscandoPOI = false;
    }
  }

  private pintarMarcadoresPOI(categoria: CategoriaPOI): void {
    for (const punto of this.puntosInteres) {
      const marcador = this.L.marker([punto.lat, punto.lng], {
        icon: this.iconoDivo(categoria.emoji, 'marcador-poi', 26)
      }).addTo(this.mapa).bindPopup(punto.nombre);
      this.marcadoresPOI.push(marcador);
    }
  }

  private limpiarMarcadoresPOI(): void {
    this.marcadoresPOI.forEach(m => this.mapa.removeLayer(m));
    this.marcadoresPOI = [];
    this.puntosInteres = [];
  }

  enfocarPunto(punto: PuntoInteres): void {
    this.mapa.setView([punto.lat, punto.lng], 17);
    const marcador = this.marcadoresPOI.find(m => {
      const pos = m.getLatLng();
      return pos.lat === punto.lat && pos.lng === punto.lng;
    });
    marcador?.openPopup();
  }

  formatDistancia(metros: number): string {
    return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1)} km`;
  }
}
