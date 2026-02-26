export class StorageManager {
  private dbName = 'AnimaFlowDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('layers')) {
          db.createObjectStore('layers');
        }
        if (!db.objectStoreNames.contains('frames')) {
          db.createObjectStore('frames', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveLayer(id: string, blob: Blob): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['layers'], 'readwrite');
      const store = transaction.objectStore('layers');
      const request = store.put(blob, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLayer(id: string): Promise<Blob | null> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['layers'], 'readonly');
      const store = transaction.objectStore('layers');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLayer(id: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    if (!id) return; // Guard against empty/undefined IDs
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['layers'], 'readwrite');
      const store = transaction.objectStore('layers');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async copyLayer(sourceId: string, destId: string): Promise<void> {
    const blob = await this.getLayer(sourceId);
    if (blob) {
      await this.saveLayer(destId, blob);
    }
  }

  async saveFrame(frame: any): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['frames'], 'readwrite');
      const store = transaction.objectStore('frames');
      const request = store.put(frame);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFrames(): Promise<any[]> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['frames'], 'readonly');
      const store = transaction.objectStore('frames');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
