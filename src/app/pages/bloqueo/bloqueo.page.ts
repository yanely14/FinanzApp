import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonItem, IonLabel, IonInput } from '@ionic/angular/standalone';
import { PinService } from '../../services/pin.service';

@Component({
  selector: 'app-bloqueo',
  standalone: true,
  templateUrl: './bloqueo.page.html',
  styleUrls: ['./bloqueo.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonItem, IonLabel, IonInput]
})
export class BloqueoPage {

  pin = '';
  error = '';

  constructor(private pinService: PinService, private router: Router) {}

  async desbloquear(): Promise<void> {
    const esValido = await this.pinService.validarPin(this.pin);
    if (!esValido) {
      this.error = 'PIN incorrecto. Intenta de nuevo.';
      this.pin = '';
      return;
    }
    this.error = '';
    this.router.navigateByUrl('/tabs/inicio');
  }
}
