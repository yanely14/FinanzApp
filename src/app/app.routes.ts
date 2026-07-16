import { Routes } from '@angular/router';
import { pinGuard } from './guards/pin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'bienvenida', pathMatch: 'full' },
  {
    path: 'bienvenida',
    loadComponent: () => import('./pages/bienvenida/bienvenida.page').then(m => m.BienvenidaPage)
  },
  {
    path: 'bloqueo',
    loadComponent: () => import('./pages/bloqueo/bloqueo.page').then(m => m.BloqueoPage)
  },
  {
    path: 'tabs',
    canActivate: [pinGuard],
    loadComponent: () => import('./tabs/tabs.component').then(m => m.TabsComponent),
    children: [
      { path: 'inicio', loadComponent: () => import('./pages/inicio/inicio.page').then(m => m.InicioPage) },
      { path: 'agregar-gasto', loadComponent: () => import('./pages/agregar-gasto/agregar-gasto.page').then(m => m.AgregarGastoPage) },
      { path: 'mapa', loadComponent: () => import('./pages/mapa/mapa.page').then(m => m.MapaPage) },
      { path: 'graficas', loadComponent: () => import('./pages/graficas/graficas.page').then(m => m.GraficasPage) },
      { path: 'metas', loadComponent: () => import('./pages/metas/metas.page').then(m => m.MetasPage) },
      { path: 'alertas', loadComponent: () => import('./pages/alertas/alertas.page').then(m => m.AlertasPage) },
      { path: 'configuracion', loadComponent: () => import('./pages/configuracion/configuracion.page').then(m => m.ConfiguracionPage) },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'bienvenida' }
];
