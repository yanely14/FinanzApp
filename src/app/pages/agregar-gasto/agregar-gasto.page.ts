import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonItem, IonSpinner,
  IonDatetime, IonDatetimeButton, IonModal, IonSegment, IonSegmentButton,
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, trashOutline, locationOutline, calendarOutline } from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-agregar-gasto',
  standalone: true,
  templateUrl: './agregar-gasto.page.html',
  styleUrls: ['./agregar-gasto.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonButton, IonIcon, IonInput, IonItem, IonSpinner,
    IonDatetime, IonDatetimeButton, IonModal, IonSegment, IonSegmentButton, IonLabel
  ]
})
export class AgregarGastoPage {

  constructor(public finanzas: FinanzasService, private router: Router) {
    addIcons({
      'camera-outline': cameraOutline,
      'trash-outline': trashOutline,
      'location-outline': locationOutline,
      'calendar-outline': calendarOutline
    });
  }

  async guardar(): Promise<void> {
    const ok = await this.finanzas.guardarGasto();
    if (ok) {
      this.router.navigateByUrl('/tabs/inicio');
    }
  }

  get avisoPresupuesto(): string | null {
    if (this.finanzas.tipoMovimientoNuevo !== 'gasto' || !this.finanzas.categoriaSeleccionada) return null;

    const estado = this.finanzas.estadoPresupuesto(this.finanzas.categoriaSeleccionada);
    if (!estado) return null;

    const categoria = this.finanzas.categoriaSeleccionada;
    const totalConEsteGasto = estado.gastado + (this.finanzas.montoGasto ?? 0);
    if (totalConEsteGasto < estado.limite) return null;

    const exceso = totalConEsteGasto - estado.limite;
    if (exceso > 0) {
      return `Con este gasto llevarás RD$ ${totalConEsteGasto.toLocaleString()} en ${categoria} (límite RD$ ${estado.limite.toLocaleString()}) — te pasarías por RD$ ${exceso.toLocaleString()}.`;
    }
    return `Llegarías justo al límite de RD$ ${estado.limite.toLocaleString()} en ${categoria} este mes.`;
  }
}
