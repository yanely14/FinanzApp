# FinanzApp

Aplicación móvil de finanzas personales desarrollada con Ionic + Angular + Capacitor. Permite registrar ingresos y gastos, definir metas de ahorro, visualizar el balance en gráficas y llevar un registro de actividad, funcionando tanto en línea como sin conexión a internet.

## Tecnologías utilizadas

- **Ionic 8** — componentes de interfaz (tabs, cards, listas con gestos, modales, action sheets)
- **Angular 20** — standalone components, lazy loading de rutas
- **Capacitor 8** — puente a APIs nativas del dispositivo
- **TypeScript**
- **Leaflet.js** — mapa interactivo (OpenStreetMap)
- **RxJS** — manejo de estado reactivo (`BehaviorSubject`) en los servicios

### Plugins de Capacitor

| Plugin | Uso en el proyecto |
|---|---|
| `@capacitor/camera` | Capturar foto del recibo al agregar un gasto |
| `@capacitor/geolocation` | Obtener la ubicación GPS del gasto y la posición del usuario en el mapa |
| `@capacitor/network` | Detectar el estado de conexión (online/offline) y su tipo |
| `@capacitor-community/bluetooth-le` | Escaneo y conexión a dispositivos Bluetooth Low Energy cercanos |
| `@capacitor/local-notifications` | Recordatorio diario y notificación al cumplir una meta de ahorro |
| `@capacitor/preferences` | Persistencia local de perfil, balance, movimientos y metas |
| `@ionic/storage-angular` | Cola de sincronización offline (operaciones pendientes) |
| `@capacitor/share` | Compartir la ubicación actual desde el mapa |

## Funcionalidades principales

- **Inicio** — balance, tasa de cambio USD→DOP en vivo, lista de movimientos con swipe para eliminar y pull-to-refresh para sincronizar
- **Agregar gasto/ingreso** — formulario con categorías, foto del recibo (cámara) y ubicación (GPS)
- **Mapa** — posición en vivo, búsqueda de lugares y puntos de interés cercanos (Leaflet + OpenStreetMap)
- **Gráficas** — resumen visual de ingresos/gastos por mes y por categoría
- **Metas** — metas de ahorro con abonos y seguimiento de progreso
- **Alertas** — historial de actividad de la cuenta
- **Configuración** — perfil de usuario, notificaciones y estado de Bluetooth
- **Modo offline** — los movimientos se guardan localmente y se sincronizan automáticamente al recuperar la conexión

## Instalación

```bash
git clone <url-del-repositorio>
cd FinanzApp
npm install
npx ionic serve
```

Para ejecutar en un dispositivo Android:

```bash
npx ionic build
npx cap sync android
npx cap open android
```

## Equipo

| Nombre | Matrícula | Módulo asignado |
|---|---|---|
| _Pendiente_ | _Pendiente_ | _Pendiente_ |

**Asignatura:** Programación de Dispositivos Móviles — ISW-307
**Facilitador:** Joan Manuel Gregorio Pérez
