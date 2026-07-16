import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonIcon, IonInput, IonButton, AlertController, ActionSheetController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, closeOutline, pencilOutline, trashOutline, cashOutline } from 'ionicons/icons';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-metas',
  standalone: true,
  templateUrl: './metas.page.html',
  styleUrls: ['./metas.page.scss'],
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonIcon, IonInput, IonButton]
})
export class MetasPage {
  // ---- formulario "nueva meta" / "editar meta" ----
  mostrarFormulario = false;
  editando = false;
  metaEditando: any = null;
  nombreNueva = '';
  emojiNueva = '🎯';
  fechaLimiteNueva = '';
  montoMetaNueva: number | null = null;

  // ---- formulario "abonar a meta" ----
  metaEnAbono: any = null;
  montoAbono: number | null = null;
  errorAbono = '';

  constructor(public finanzas: FinanzasService, private alertController: AlertController, private actionSheetController: ActionSheetController) {
    addIcons({
      'add-circle-outline': addCircleOutline,
      'close-outline': closeOutline,
      'pencil-outline': pencilOutline,
      'trash-outline': trashOutline,
      'cash-outline': cashOutline
    });
  }

   async abrirMenuMeta(meta: any): Promise<void> {
    const sheet = await this.actionSheetController.create({
      header: `${meta.emoji} ${meta.nombre}`,
      cssClass: 'menu-meta-sheet',
      buttons: [
        {
          text: 'Abonar',
          icon: 'cash-outline',
          handler: () => this.abrirAbono(meta)
        },
        {
          text: 'Editar',
          icon: 'pencil-outline',
          handler: () => this.abrirEdicion(meta)
        },
        {
          text: 'Eliminar',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => this.eliminarMeta(meta)
        },
        {
          text: 'Cancelar',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });
    await sheet.present();
  }

  abrirFormulario(): void {
    this.editando = false;
    this.metaEditando = null;
    this.mostrarFormulario = true;
  }

  abrirEdicion(meta: any): void {
    this.editando = true;
    this.metaEditando = meta;
    this.nombreNueva = meta.nombre;
    this.emojiNueva = meta.emoji;
    this.fechaLimiteNueva = meta.fechaLimite;
    this.montoMetaNueva = meta.meta;
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.editando = false;
    this.metaEditando = null;
    this.nombreNueva = '';
    this.emojiNueva = '🎯';
    this.fechaLimiteNueva = '';
    this.montoMetaNueva = null;
  }

  elegirSugerencia(sugerencia: { nombre: string; emoji: string }): void {
    this.nombreNueva = sugerencia.nombre;
    this.emojiNueva = sugerencia.emoji;
  }

  guardarMetaNueva(): void {
    if (!this.nombreNueva || !this.montoMetaNueva || !this.fechaLimiteNueva) return;

    if (this.editando && this.metaEditando) {
      this.finanzas.editarMeta(this.metaEditando, this.nombreNueva, this.emojiNueva, this.fechaLimiteNueva, this.montoMetaNueva);
    } else {
      this.finanzas.agregarMeta(this.nombreNueva, this.emojiNueva, this.fechaLimiteNueva, this.montoMetaNueva);
    }

    this.cerrarFormulario();
  }

  async eliminarMeta(meta: any): Promise<void> {
    const alert = await this.alertController.create({
      header: '¿Eliminar meta?',
      message: `Vas a eliminar la meta "${meta.nombre}". Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, eliminar',
          role: 'destructive',
          handler: () => this.finanzas.eliminarMeta(meta)
        }
      ]
    });
    await alert.present();
  }

  abrirAbono(meta: any): void {
    this.metaEnAbono = meta;
    this.montoAbono = null;
    this.errorAbono = '';
  }

  cerrarAbono(): void {
    this.metaEnAbono = null;
    this.montoAbono = null;
    this.errorAbono = '';
  }

  confirmarAbono(): void {
    if (!this.montoAbono) return;
    const exito = this.finanzas.abonarAMeta(this.metaEnAbono, this.montoAbono);
    if (exito) {
      this.cerrarAbono();
    } else {
      this.errorAbono = 'Saldo insuficiente. Tu saldo disponible es RD$ ' + this.finanzas.balance.toLocaleString();
    }
  }
}
