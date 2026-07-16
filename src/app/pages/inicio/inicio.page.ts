import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonList, IonItem, IonLabel, IonIcon,
  IonRefresher, IonRefresherContent, IonItemSliding, IonItemOptions, IonItemOption,
  IonSearchbar, IonSegment, IonSegmentButton,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, cloudUploadOutline, timeOutline, documentTextOutline, trashOutline, createOutline } from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonList, IonItem, IonLabel, IonIcon,
    IonRefresher, IonRefresherContent, IonItemSliding, IonItemOptions, IonItemOption,
    IonSearchbar, IonSegment, IonSegmentButton
  ]
})
export class InicioPage {

  textoFiltro = '';
  categoriaFiltro = '';

  constructor(public finanzas: FinanzasService, private alertController: AlertController) {
    addIcons({
      'cloud-offline-outline': cloudOfflineOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'time-outline': timeOutline,
      'document-text-outline': documentTextOutline,
      'trash-outline': trashOutline,
      'create-outline': createOutline
    });
  }

  get categoriasDisponibles(): string[] {
    return Array.from(new Set(this.finanzas.movimientos.map(m => m.categoria)));
  }

  get movimientosFiltrados(): { mov: FinanzasService['movimientos'][number]; indice: number }[] {
    const texto = this.textoFiltro.trim().toLowerCase();
    return this.finanzas.movimientos
      .map((mov, indice) => ({ mov, indice }))
      .filter(({ mov }) => {
        const coincideTexto = !texto
          || mov.titulo.toLowerCase().includes(texto)
          || mov.categoria.toLowerCase().includes(texto);
        const coincideCategoria = !this.categoriaFiltro || mov.categoria === this.categoriaFiltro;
        return coincideTexto && coincideCategoria;
      });
  }

  async refrescar(event: any): Promise<void> {
    await this.finanzas.syncPendingOperations();
    event.target.complete();
  }

  borrarMovimiento(index: number): void {
    this.finanzas.eliminarMovimiento(index);
  }

  async editarMovimiento(index: number): Promise<void> {
    const mov = this.finanzas.movimientos[index];
    if (!mov) return;

    const alert = await this.alertController.create({
      header: 'Editar movimiento',
      inputs: [
        {
          name: 'monto',
          type: 'number',
          placeholder: 'Monto',
          value: mov.monto
        },
        {
          name: 'descripcion',
          type: 'text',
          placeholder: 'Descripción',
          value: mov.titulo
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (datos) => {
            this.finanzas.editarMovimiento(index, parseFloat(datos.monto), datos.descripcion ?? '');
          }
        }
      ]
    });

    await alert.present();
  }
}
