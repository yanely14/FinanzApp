import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PendingOperation {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface OfflineQueueStatus {
  count: number;
  operations: PendingOperation[];
  isSyncing: boolean;
  lastSyncTime: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineManagerService {
  private queueSubject = new BehaviorSubject<PendingOperation[]>([]);
  private syncingSubject = new BehaviorSubject<boolean>(false);
  private statusSubject = new BehaviorSubject<OfflineQueueStatus>({
    count: 0,
    operations: [],
    isSyncing: false,
    lastSyncTime: null
  });

  private readonly QUEUE_KEY = 'pending_operations_queue';
  private readonly MAX_RETRIES = 3;
  private readonly STORAGE_PREFIX = 'offline_data_';

  public queue$: Observable<PendingOperation[]> = this.queueSubject.asObservable();
  public syncing$: Observable<boolean> = this.syncingSubject.asObservable();
  public status$: Observable<OfflineQueueStatus> = this.statusSubject.asObservable();

  constructor(private storage: Storage) {
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await this.storage.create();
      await this.loadQueue();
    } catch (error) {
      console.error('Error inicializando Storage:', error);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      // ✅ CORRECTO: this.storage.get() en lugar de getItem()
      const raw = await this.storage.get(this.QUEUE_KEY);
      const operations: PendingOperation[] = raw ? JSON.parse(raw) : [];
      this.queueSubject.next(operations);
      this.updateStatus();
    } catch (error) {
      console.error('Error cargando la cola:', error);
      this.queueSubject.next([]);
    }
  }

  async addPendingOperation(
    type: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    payload: any
  ): Promise<PendingOperation> {
    const operation: PendingOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };

    const updatedQueue = [...this.queueSubject.value, operation];
    // ✅ CORRECTO: this.storage.set() en lugar de setItem()
    await this.storage.set(this.QUEUE_KEY, JSON.stringify(updatedQueue));
    this.queueSubject.next(updatedQueue);
    this.updateStatus();

    console.log(`✅ Operación ${operation.id} guardada localmente`);
    return operation;
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    return this.queueSubject.value;
  }

  async getPendingOperationById(id: string): Promise<PendingOperation | undefined> {
    return this.queueSubject.value.find(op => op.id === id);
  }

  async removePendingOperation(operationId: string): Promise<void> {
    const updatedQueue = this.queueSubject.value.filter(op => op.id !== operationId);
    // ✅ CORRECTO: this.storage.set() en lugar de setItem()
    await this.storage.set(this.QUEUE_KEY, JSON.stringify(updatedQueue));
    this.queueSubject.next(updatedQueue);
    this.updateStatus();
    console.log(`🗑️ Operación ${operationId} eliminada de la cola`);
  }

  async updateRetryCount(operationId: string, error?: string): Promise<void> {
    const queue = [...this.queueSubject.value];
    const operation = queue.find(op => op.id === operationId);

    if (operation) {
      operation.retryCount++;
      operation.lastError = error;

      if (operation.retryCount >= this.MAX_RETRIES) {
        console.warn(`⚠️ Operación ${operationId} excedió reintentos máximos`);
        await this.removePendingOperation(operationId);
        return;
      }

      // ✅ CORRECTO: this.storage.set() en lugar de setItem()
      await this.storage.set(this.QUEUE_KEY, JSON.stringify(queue));
      this.queueSubject.next(queue);
      this.updateStatus();
    }
  }

  async saveLocalData(key: string, data: any): Promise<void> {
    const storageKey = `${this.STORAGE_PREFIX}${key}`;
    // ✅ CORRECTO: this.storage.set() en lugar de setItem()
    await this.storage.set(storageKey, JSON.stringify(data));
    console.log(`💾 Datos locales guardados en: ${storageKey}`);
  }

  async getLocalData(key: string): Promise<any> {
    const storageKey = `${this.STORAGE_PREFIX}${key}`;
    // ✅ CORRECTO: this.storage.get() en lugar de getItem()
    const raw = await this.storage.get(storageKey);
    return raw ? JSON.parse(raw) : null;
  }

  async removeLocalData(key: string): Promise<void> {
    const storageKey = `${this.STORAGE_PREFIX}${key}`;
    // ✅ CORRECTO: this.storage.remove() en lugar de removeItem()
    await this.storage.remove(storageKey);
    console.log(`🗑️ Datos locales eliminados: ${storageKey}`);
  }

  async clearQueue(): Promise<void> {
    // ✅ CORRECTO: this.storage.remove() en lugar de removeItem()
    await this.storage.remove(this.QUEUE_KEY);
    this.queueSubject.next([]);
    this.updateStatus();
    console.log('🧹 Cola limpiada completamente');
  }

  setSyncing(isSyncing: boolean): void {
    this.syncingSubject.next(isSyncing);
    this.updateStatus();
  }

  private updateStatus(): void {
    this.statusSubject.next({
      count: this.queueSubject.value.length,
      operations: this.queueSubject.value,
      isSyncing: this.syncingSubject.value,
      lastSyncTime: this.statusSubject.value.lastSyncTime
    });
  }

  updateLastSyncTime(): void {
    const current = this.statusSubject.value;
    this.statusSubject.next({ ...current, lastSyncTime: Date.now() });
  }

  getQueueCount(): number {
    return this.queueSubject.value.length;
  }

  hasOfflineOperations(): boolean {
    return this.queueSubject.value.length > 0;
  }
}
