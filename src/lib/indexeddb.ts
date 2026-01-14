import { LocalOrder, SyncQueueItem, LocalTable } from '@/types';

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'cafe-orders-db';
  private readonly dbVersion = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.db = db;

        // Create object stores
        if (!db.objectStoreNames.contains('localOrders')) {
          const ordersStore = db.createObjectStore('localOrders', { keyPath: 'local_order_id' });
          ordersStore.createIndex('sync_status', 'sync_status', { unique: false });
          ordersStore.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('localTables')) {
          const tablesStore = db.createObjectStore('localTables', { keyPath: 'id' });
          tablesStore.createIndex('last_updated', 'last_updated', { unique: false });
        }

        console.log('IndexedDB schema created');
      };
    });
  }

  // Local Orders CRUD
  async saveLocalOrder(order: LocalOrder): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localOrders'], 'readwrite');
      const store = transaction.objectStore('localOrders');
      const request = store.put(order);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLocalOrder(localOrderId: string): Promise<LocalOrder | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localOrders'], 'readonly');
      const store = transaction.objectStore('localOrders');
      const request = store.get(localOrderId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllLocalOrders(): Promise<LocalOrder[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localOrders'], 'readonly');
      const store = transaction.objectStore('localOrders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncOrders(): Promise<LocalOrder[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localOrders'], 'readonly');
      const store = transaction.objectStore('localOrders');
      const index = store.index('sync_status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateLocalOrder(localOrderId: string, updates: Partial<LocalOrder>): Promise<void> {
    if (!this.db) await this.init();

    const existingOrder = await this.getLocalOrder(localOrderId);
    if (!existingOrder) throw new Error('Order not found');

    const updatedOrder = { ...existingOrder, ...updates, updated_at: new Date().toISOString() };
    await this.saveLocalOrder(updatedOrder);
  }

  async deleteLocalOrder(localOrderId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localOrders'], 'readwrite');
      const store = transaction.objectStore('localOrders');
      const request = store.delete(localOrderId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue CRUD
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('created_at');
      const request = index.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        // Sort by creation time
        items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingItem = getRequest.result;
        if (!existingItem) {
          reject(new Error('Sync queue item not found'));
          return;
        }

        const updatedItem = { ...existingItem, ...updates };
        const putRequest = store.put(updatedItem);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Local Tables CRUD
  async saveLocalTable(table: LocalTable): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localTables'], 'readwrite');
      const store = transaction.objectStore('localTables');
      const request = store.put(table);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLocalTable(id: number): Promise<LocalTable | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localTables'], 'readonly');
      const store = transaction.objectStore('localTables');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllLocalTables(): Promise<LocalTable[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['localTables'], 'readonly');
      const store = transaction.objectStore('localTables');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    const stores = ['localOrders', 'syncQueue', 'localTables'];
    const promises = stores.map(storeName => {
      return new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getStorageStats(): Promise<{
    ordersCount: number;
    syncQueueCount: number;
    tablesCount: number;
  }> {
    if (!this.db) await this.init();

    const [orders, syncItems, tables] = await Promise.all([
      this.getAllLocalOrders(),
      this.getSyncQueue(),
      this.getAllLocalTables()
    ]);

    return {
      ordersCount: orders.length,
      syncQueueCount: syncItems.length,
      tablesCount: tables.length
    };
  }
}

export const indexedDBManager = new IndexedDBManager();
