# Módulo de Mapa, GPS y Puntos de Interés

Documentación del módulo que cumple con la indicación de: interfaz de mapas en Ionic,
GPS/geolocalización en tiempo real, búsqueda de lugares cercanos y permisos de ubicación.

## 1. Dónde está

| Elemento | Archivo |
|---|---|
| Página del mapa (UI) | [`src/app/pages/mapa/mapa.page.ts`](../src/app/pages/mapa/mapa.page.ts), `.html`, `.scss` |
| Lógica de datos / APIs | [`src/app/services/mapa.service.ts`](../src/app/services/mapa.service.ts) |
| Ruta | `/tabs/mapa` (registrada en [`src/app/app.routes.ts`](../src/app/app.routes.ts)) |
| Acceso desde la UI | Pestaña "Mapa" en la barra de navegación inferior ([`tabs.component.html`](../src/app/tabs/tabs.component.html)) |
| Permisos Android | [`android/app/src/main/AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) |

También existe una integración más simple de ubicación en
[`src/app/services/finanzas.service.ts`](../src/app/services/finanzas.service.ts) (funciones
`obtenerUbicacion`/`urlMapa`), usada para adjuntar la ubicación GPS a un gasto registrado. Esa
función solo captura un punto puntual; el módulo nuevo descrito aquí es el que cubre mapa
interactivo, búsqueda y puntos de interés.

## 2. APIs / fuentes de datos utilizadas

No se usa Google Maps API (requiere facturación/API key). Se usaron APIs abiertas de
OpenStreetMap, sin necesidad de clave ni configuración de credenciales:

- **Teselas del mapa (tiles):** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, renderizadas
  con la librería [Leaflet](https://leafletjs.com/) (`leaflet` en `package.json`).
- **Búsqueda de direcciones/lugares (geocodificación):** API de búsqueda de
  [Nominatim](https://nominatim.org/release-docs/latest/api/Search/) —
  `https://nominatim.openstreetmap.org/search`.
- **Puntos de interés cercanos (restaurantes, tiendas, turismo, salud, bancos, gasolineras):**
  [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) —
  `https://overpass-api.de/api/interpreter`, que consulta la base de datos de OpenStreetMap con
  el lenguaje Overpass QL.
- **Compartir ubicación:** plugin nativo `@capacitor/share`, que abre la hoja de compartir del
  sistema operativo (WhatsApp, correo, SMS, etc.) con un enlace de OpenStreetMap.
- **GPS del dispositivo:** plugin `@capacitor/geolocation`.

> Nota: Nominatim y Overpass son servicios públicos gratuitos con límite de uso razonable
> (rate limiting). Para una versión en producción con mucho tráfico se recomendaría un servidor
> propio de Nominatim/Overpass, o pasar a Google Places/Foursquare con API key.

## 3. Funciones de `MapaService` y cómo procesan los datos

- **`solicitarPermisos(): Promise<boolean>`**
  Consulta `Geolocation.checkPermissions()`; si no está concedido, dispara
  `Geolocation.requestPermissions()` (diálogo nativo del SO). Devuelve `true` solo si el permiso
  queda en `granted`.

- **`obtenerUbicacionActual(): Promise<Coordenadas>`**
  Pide permiso y luego llama a `Geolocation.getCurrentPosition({ enableHighAccuracy: true })`.
  Convierte la respuesta nativa (`coords.latitude/longitude/accuracy`) al tipo interno
  `Coordenadas { lat, lng, precisionMetros }` que usa el resto de la app.

- **`iniciarSeguimiento(onUbicacion)` / `detenerSeguimiento()`**
  Abren/cierran un `Geolocation.watchPosition(...)`, que sigue emitiendo la posición del GPS
  mientras la pantalla del mapa está en modo "Seguir en vivo". Cada posición nueva se transforma
  al mismo tipo `Coordenadas` y se entrega vía callback a la página, que actualiza el marcador y
  el círculo de precisión sin recargar el mapa.

- **`buscarLugar(texto): Promise<LugarBuscado[]>`**
  Arma la URL de Nominatim con el texto ingresado (`q=`), idioma español (`accept-language=es`) y
  límite de 6 resultados. La respuesta JSON (`display_name`, `lat`, `lon` en texto) se parsea a
  `LugarBuscado { nombre, lat, lng }` con `parseFloat` en las coordenadas.

- **`buscarPuntosInteres(centro, categoria, radioMetros=1500): Promise<PuntoInteres[]>`**
  Construye una consulta Overpass QL (`node`/`way` con el filtro de etiquetas de la categoría,
  ej. `["amenity"~"restaurant|fast_food|cafe"]`, dentro de un radio en metros alrededor del
  centro) y la envía por `POST` como `application/x-www-form-urlencoded`. La respuesta trae una
  lista de `elements`; cada uno se convierte a `PuntoInteres { id, nombre, categoria, lat, lng,
  distanciaMetros }`, calculando la distancia con `distanciaMetros()` y descartando elementos sin
  coordenadas. El resultado se ordena de más cercano a más lejano.

- **`compartirUbicacion(coords): Promise<void>`**
  Genera un enlace de OpenStreetMap con la latitud/longitud (`?mlat=...&mlon=...`) y lo pasa a
  `Share.share()` del plugin `@capacitor/share`, que abre la hoja nativa de compartir del
  dispositivo con ese enlace de ubicación en tiempo real.

- **`distanciaMetros(a, b): number`**
  Implementa la fórmula de Haversine para calcular la distancia entre dos coordenadas GPS sobre
  la esfera terrestre (radio 6 371 km). Se usa para ordenar y mostrar la distancia a cada punto
  de interés.

## 4. Funciones de `MapaPage` (interfaz)

- **`ngAfterViewInit()`**: importa Leaflet dinámicamente, crea el mapa centrado en Santo Domingo
  por defecto y llama a `usarMiUbicacion()` para centrar en el GPS real del usuario si el permiso
  está disponible.
- **`usarMiUbicacion()`**: pide la posición actual al servicio, centra el mapa y dibuja el
  marcador del usuario junto con un círculo que representa la precisión GPS reportada.
- **`alternarSeguimientoEnVivo()`**: activa/desactiva `iniciarSeguimiento`/`detenerSeguimiento`
  del servicio; mientras está activo, el marcador del usuario se mueve solo en tiempo real.
- **`compartir()`**: llama a `compartirUbicacion()` con la última posición conocida del marcador
  del usuario.
- **`onBuscarInput(event)`**: se dispara con el `ionInput` (debounce de 500 ms) de la barra de
  búsqueda; si hay 3+ caracteres, llama a `buscarLugar()` y muestra la lista de resultados.
- **`seleccionarResultado(lugar)`**: centra el mapa en el resultado elegido y coloca un marcador.
- **`seleccionarCategoria(categoria)`**: alterna la categoría de POI activa, limpia marcadores
  anteriores y busca puntos de interés alrededor del **centro actual del mapa** (no solo del GPS,
  para poder explorar otras zonas moviendo el mapa).
- **`enfocarPunto(punto)`**: centra el mapa sobre un resultado de la lista y abre su popup.

## 5. Permisos configurados

- **Android** (`AndroidManifest.xml`): `ACCESS_FINE_LOCATION` (ya existía, usada también por
  Bluetooth LE) y `ACCESS_COARSE_LOCATION` (agregada). El plugin `@capacitor/geolocation` también
  fusiona estos permisos automáticamente desde su propio manifiesto al compilar.
- **En tiempo de ejecución**: `MapaService.solicitarPermisos()` dispara el diálogo nativo de
  Android/iOS la primera vez que se usa el GPS; si el usuario lo niega, la página muestra un
  mensaje de error explicando que debe activarlo manualmente en Ajustes.
- Se ejecutó `npx cap sync android` para registrar los plugins nativos `@capacitor/geolocation` y
  `@capacitor/share` en el proyecto Android (antes no estaban sincronizados en
  `android/capacitor.settings.gradle`, aunque `geolocation` ya figuraba en `package.json`).

## 6. Precisión de la ubicación y estabilidad de la conexión

- La precisión GPS (`coords.accuracy`, en metros) se muestra siempre en pantalla ("Precisión GPS:
  ±X m") y se dibuja como un círculo alrededor del marcador del usuario, para que sea visible
  cuándo la posición es poco confiable (por ejemplo, en interiores).
- El estado de conexión a internet se toma de `NetworkService` (ya usado en el resto de la app) y
  se muestra en la parte superior del mapa, porque la búsqueda de direcciones y de puntos de
  interés depende de que haya red.
- Todas las llamadas a Nominatim/Overpass están en bloques `try/catch`; si fallan (sin conexión,
  timeout, servicio caído), se muestra un mensaje de error en pantalla en vez de dejar la
  interfaz colgada o romper la app.

## 7. Pruebas pendientes por hacer (dispositivos reales / video)

Este repositorio se editó y se verificó en el navegador de escritorio (compilación y flujo de
UI). **Falta ejecutar y grabar** lo que pide la indicación en dispositivos reales:

1. `npx cap sync android` (ya ejecutado) y luego `npx cap open android` para compilar/correr en
   un emulador o teléfono Android real desde Android Studio.
2. Probar en al menos dos dispositivos/tamaños de pantalla distintos (o un emulador con otra
   versión de Android) para validar compatibilidad.
3. Verificar en cada uno: permiso de ubicación solicitado correctamente, precisión GPS mostrada,
   búsqueda de lugares y de puntos de interés funcionando con conexión real, botón "Compartir"
   abriendo la hoja nativa del sistema.
4. Grabar un video corto (captura de pantalla del dispositivo) mostrando ese flujo completo, tal
   como pide la indicación.
