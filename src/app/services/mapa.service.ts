import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Coordenadas {
  lat: number;
  lng: number;
  precisionMetros?: number;
}

export interface LugarBuscado {
  nombre: string;
  lat: number;
  lng: number;
}

export interface PuntoInteres {
  id: string;
  nombre: string;
  categoria: string;
  lat: number;
  lng: number;
  distanciaMetros: number;
}

export interface CategoriaPOI {
  id: string;
  nombre: string;
  emoji: string;
  /** Filtro de etiquetas OSM usado en la consulta Overpass */
  filtroOverpass: string;
}

@Injectable({ providedIn: 'root' })
export class MapaService {

  /** Categorías de puntos de interés ofrecidas en la búsqueda cercana */
  readonly categorias: CategoriaPOI[] = [
    { id: 'restaurantes', nombre: 'Restaurantes', emoji: '🍽️', filtroOverpass: '["amenity"~"restaurant|fast_food|cafe"]' },
    { id: 'tiendas', nombre: 'Tiendas', emoji: '🛍️', filtroOverpass: '["shop"]' },
    { id: 'turismo', nombre: 'Turismo', emoji: '🗺️', filtroOverpass: '["tourism"~"attraction|museum|viewpoint|hotel"]' },
    { id: 'salud', nombre: 'Salud', emoji: '💊', filtroOverpass: '["amenity"~"hospital|pharmacy|clinic"]' },
    { id: 'bancos', nombre: 'Bancos', emoji: '🏦', filtroOverpass: '["amenity"~"bank|atm"]' },
    { id: 'gasolineras', nombre: 'Gasolineras', emoji: '⛽', filtroOverpass: '["amenity"="fuel"]' },
  ];

  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  private watchId: string | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Pide (si hace falta) permiso de ubicación al sistema operativo.
   * En Android dispara el diálogo nativo de permisos la primera vez.
   */
  async solicitarPermisos(): Promise<boolean> {
    const { Geolocation } = await import('@capacitor/geolocation');
    try {
      const estado = await Geolocation.checkPermissions();
      if (estado.location === 'granted') return true;

      const solicitado = await Geolocation.requestPermissions();
      return solicitado.location === 'granted';
    } catch {
      // Algunos navegadores/WebViews (Safari, WKWebView) no implementan la
      // Permissions API para geolocalización. En ese caso dejamos que sea la
      // propia llamada a getCurrentPosition/watchPosition la que dispare el
      // permiso nativo del sistema operativo.
      return true;
    }
  }

  /** Obtiene la posición GPS actual una sola vez (alta precisión). */
  async obtenerUbicacionActual(): Promise<Coordenadas> {
    const permiso = await this.solicitarPermisos();
    if (!permiso) {
      throw new Error('Permiso de ubicación denegado. Actívalo en Ajustes del dispositivo.');
    }

    const { Geolocation } = await import('@capacitor/geolocation');
    const posicion = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });

    return {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      precisionMetros: posicion.coords.accuracy
    };
  }

  /**
   * Inicia el seguimiento de ubicación en tiempo real: invoca `onUbicacion`
   * cada vez que el GPS reporta una nueva posición hasta que se llame a
   * `detenerSeguimiento()`.
   */
  async iniciarSeguimiento(onUbicacion: (coords: Coordenadas) => void): Promise<void> {
    const permiso = await this.solicitarPermisos();
    if (!permiso) {
      throw new Error('Permiso de ubicación denegado. Actívalo en Ajustes del dispositivo.');
    }

    const { Geolocation } = await import('@capacitor/geolocation');
    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (posicion, error) => {
        if (error || !posicion) return;
        onUbicacion({
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
          precisionMetros: posicion.coords.accuracy
        });
      }
    );
  }

  /** Detiene el seguimiento en tiempo real iniciado con `iniciarSeguimiento`. */
  async detenerSeguimiento(): Promise<void> {
    if (!this.watchId) return;
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.clearWatch({ id: this.watchId });
    this.watchId = null;
  }

  /**
   * Geocodifica un texto libre (ej. "Malecón, Santo Domingo") a coordenadas
   * usando la API de búsqueda de Nominatim (OpenStreetMap).
   */
  async buscarLugar(texto: string): Promise<LugarBuscado[]> {
    const query = texto.trim();
    if (!query) return [];

    const url = `${this.NOMINATIM_URL}?format=json&limit=6&accept-language=es&q=${encodeURIComponent(query)}`;
    const resultados = await firstValueFrom(this.http.get<any[]>(url));

    return resultados.map(r => ({
      nombre: r.display_name as string,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon)
    }));
  }

  /**
   * Busca puntos de interés cercanos a un centro dado usando la API Overpass
   * (motor de consultas sobre datos de OpenStreetMap). Devuelve resultados
   * ordenados por distancia.
   */
  async buscarPuntosInteres(centro: Coordenadas, categoria: CategoriaPOI, radioMetros = 1500): Promise<PuntoInteres[]> {
    const consulta = `
      [out:json][timeout:15];
      (
        node${categoria.filtroOverpass}(around:${radioMetros},${centro.lat},${centro.lng});
        way${categoria.filtroOverpass}(around:${radioMetros},${centro.lat},${centro.lng});
      );
      out center 40;
    `;

    const cuerpo = new URLSearchParams({ data: consulta }).toString();
    const respuesta = await firstValueFrom(
      this.http.post<{ elements: any[] }>(this.OVERPASS_URL, cuerpo, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    );

    return respuesta.elements
      .map(el => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (lat == null || lng == null) return null;
        return {
          id: `${el.type}/${el.id}`,
          nombre: el.tags?.name ?? categoria.nombre,
          categoria: categoria.nombre,
          lat,
          lng,
          distanciaMetros: this.distanciaMetros(centro, { lat, lng })
        } as PuntoInteres;
      })
      .filter((p): p is PuntoInteres => p !== null)
      .sort((a, b) => a.distanciaMetros - b.distanciaMetros);
  }

  /**
   * Comparte la ubicación dada mediante la hoja nativa de compartir
   * (WhatsApp, correo, SMS, etc.) usando un enlace de OpenStreetMap.
   */
  async compartirUbicacion(coords: Coordenadas): Promise<void> {
    const url = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`;
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: 'Mi ubicación',
      text: 'Esta es mi ubicación actual:',
      url
    });
  }

  /** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
  distanciaMetros(a: Coordenadas, b: Coordenadas): number {
    const R = 6371000;
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const lat1 = rad(a.lat);
    const lat2 = rad(b.lat);

    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
  }
}
