import type { ISessionStorageAdapter } from '../types/index.js';
export interface RecoverySessionData {
    recoveryToken: string;
    gameId: string;
    inviteId: string;
    userId: string;
    savedAt: number;
    expiresAt: number;
    payload?: Record<string, unknown>;
}
/**
 * @deprecated
 * Room ownership belongs to the game implementation.
 * The SDK does not own, generate, or persist Room IDs or recovery tokens.
 * This class is retained for backwards compatibility only.
 */
export declare class SessionRecoveryManager {
    private readonly storageAdapter;
    private readonly logger;
    private static readonly STORAGE_KEY;
    private readonly ttlMs;
    constructor(storageAdapter?: ISessionStorageAdapter, ttlMinutes?: number);
    /**
     * Persists a cold recovery token and session metadata securely via ISessionStorageAdapter.
     */
    saveRecoveryToken(recoveryToken: string, gameId: string, inviteId: string, userId: string, payload?: Record<string, unknown>): Promise<void>;
    /**
     * Retrieves and validates active recovery token if within the cold recovery window.
     */
    getRecoverySession(): Promise<RecoverySessionData | null>;
    /**
     * Clears saved recovery session data.
     */
    clearRecoveryToken(): Promise<void>;
}
//# sourceMappingURL=SessionRecoveryManager.d.ts.map