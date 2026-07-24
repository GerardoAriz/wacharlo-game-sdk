import { ISessionStorageAdapter } from '../types/index.js';
/**
 * @deprecated Legacy in-memory fallback storage adapter.
 * Room ownership belongs to the game implementation.
 */
export declare class MemoryStorageAdapter implements ISessionStorageAdapter {
    private storage;
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
/**
 * @deprecated Web localStorage adapter for browser environments.
 * Room ownership belongs to the game implementation.
 */
export declare class LocalStorageAdapter implements ISessionStorageAdapter {
    private fallback;
    private get isAvailable();
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=StorageAdapter.d.ts.map