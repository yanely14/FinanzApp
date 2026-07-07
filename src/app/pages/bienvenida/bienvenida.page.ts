import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonItem, IonLabel, IonInput } from '@ionic/angular/standalone';
import { FinanzasService } from '../../services/finanzas.service';

@Component({
  selector: 'app-bienvenida',
  standalone: true,
  templateUrl: './bienvenida.page.html',
  styleUrls: ['./bienvenida.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonItem, IonLabel, IonInput]
})
export class BienvenidaPage {

  constructor(public finanzas: FinanzasService, private router: Router) {}

  async continuar(): Promise<void> {
    if (!this.finanzas.usuarioRegistrado) {
      const ok = await this.finanzas.guardarUsuario();
      if (!ok) return;
    }
    this.router.navigateByUrl('/tabs/inicio');
  }
}
