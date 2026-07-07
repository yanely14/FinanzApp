import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, addCircleOutline, barChartOutline, flagOutline, notificationsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet]
})
export class TabsComponent {
  constructor() {
    addIcons({
      'home-outline': homeOutline,
      'add-circle-outline': addCircleOutline,
      'bar-chart-outline': barChartOutline,
      'flag-outline': flagOutline,
      'notifications-outline': notificationsOutline
    });
  }
}
