import { ISessionStorageAdapter } from '../types/index.js';

/**
 * @deprecated Legacy in-memory fallback storage adapter.
 * Room ownership belongs to the game implementation.
 */
export class MemoryStorageAdapter implements ISessionStorageAdapter {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

/**
 * @deprecated Web localStorage adapter for browser environments.
 * Room ownership belongs to the game implementation.
 */
export class LocalStorageAdapter implements ISessionStorageAdapter {
  private fallback = new MemoryStorageAdapter();

  private get isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.isAvailable) return this.fallback.getItem(key);
    try {
      return window.localStorage.getItem(key);
    } catch {
      return this.fallback.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.isAvailable) return this.fallback.setItem(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      await this.fallback.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isAvailable) return this.fallback.removeItem(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      await this.fallback.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable) return this.fallback.clear();
    try {
      window.localStorage.clear();
    } catch {
      await this.fallback.clear();
    }
  }
}
