import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouteReuseStrategy } from '@angular/router';
import { provideIonicAngular, IonicRouteStrategy } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes),
    provideHttpClient(withInterceptors([])),
    provideIonicAngular(),
    provideHttpClient(),
    // 👇 PROVEEDOR DEL STORAGE AQUÍ
    IonicStorageModule.forRoot({
      name: '__finanzapp_db',
      version: 1,
      storeName: 'offline_queue',
      dbKey: 'finanzapp_storage'
    }).providers || []
  ]
}).catch(err => console.error(err));
defineCustomElements(window);
