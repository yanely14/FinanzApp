import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButtons,
  IonMenuButton
} from '@ionic/angular/standalone';

import { NetworkService } from '../services/network.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonButtons,
    IonMenuButton
  ],
})
export class FolderPage implements OnInit {

  public folder!: string;
  isOnline: boolean = true;

  constructor(
    private activatedRoute: ActivatedRoute,
    private networkService: NetworkService
  ) {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;

    this.networkService.getNetworkStatus().subscribe((status: boolean) => {
      this.isOnline = status;
    });
  }
}