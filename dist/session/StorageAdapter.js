/**
 * @deprecated Legacy in-memory fallback storage adapter.
 * Room ownership belongs to the game implementation.
 */
export class MemoryStorageAdapter {
    storage = new Map();
    async getItem(key) {
        return this.storage.get(key) ?? null;
    }
    async setItem(key, value) {
        this.storage.set(key, value);
    }
    async removeItem(key) {
        this.storage.delete(key);
    }
    async clear() {
        this.storage.clear();
    }
}
/**
 * @deprecated Web localStorage adapter for browser environments.
 * Room ownership belongs to the game implementation.
 */
export class LocalStorageAdapter {
    fallback = new MemoryStorageAdapter();
    get isAvailable() {
        try {
            return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
        }
        catch {
            return false;
        }
    }
    async getItem(key) {
        if (!this.isAvailable)
            return this.fallback.getItem(key);
        try {
            return window.localStorage.getItem(key);
        }
        catch {
            return this.fallback.getItem(key);
        }
    }
    async setItem(key, value) {
        if (!this.isAvailable)
            return this.fallback.setItem(key, value);
        try {
            window.localStorage.setItem(key, value);
        }
        catch {
            await this.fallback.setItem(key, value);
        }
    }
    async removeItem(key) {
        if (!this.isAvailable)
            return this.fallback.removeItem(key);
        try {
            window.localStorage.removeItem(key);
        }
        catch {
            await this.fallback.removeItem(key);
        }
    }
    async clear() {
        if (!this.isAvailable)
            return this.fallback.clear();
        try {
            window.localStorage.clear();
        }
        catch {
            await this.fallback.clear();
        }
    }
}
//# sourceMappingURL=StorageAdapter.js.map