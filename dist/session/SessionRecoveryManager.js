import { LocalStorageAdapter } from './StorageAdapter.js';
import { Logger } from '../logger/Logger.js';
/**
 * @deprecated
 * Room ownership belongs to the game implementation.
 * The SDK does not own, generate, or persist Room IDs or recovery tokens.
 * This class is retained for backwards compatibility only.
 */
export class SessionRecoveryManager {
    storageAdapter;
    logger = new Logger('SessionRecoveryManager');
    static STORAGE_KEY = '__wacha_session_recovery_token__';
    ttlMs;
    constructor(storageAdapter = new LocalStorageAdapter(), ttlMinutes = 5) {
        this.storageAdapter = storageAdapter;
        this.ttlMs = ttlMinutes * 60 * 1000;
    }
    /**
     * Persists a cold recovery token and session metadata securely via ISessionStorageAdapter.
     */
    async saveRecoveryToken(recoveryToken, gameId, inviteId, userId, payload) {
        const now = Date.now();
        const data = {
            recoveryToken,
            gameId,
            inviteId,
            userId,
            savedAt: now,
            expiresAt: now + this.ttlMs,
            payload,
        };
        try {
            await this.storageAdapter.setItem(SessionRecoveryManager.STORAGE_KEY, JSON.stringify(data));
            this.logger.info(`Persisted recovery token for userId '${userId}', expires in ${this.ttlMs / 1000}s`);
        }
        catch (err) {
            this.logger.warn(`Failed to persist recovery token: ${err}`);
        }
    }
    /**
     * Retrieves and validates active recovery token if within the cold recovery window.
     */
    async getRecoverySession() {
        try {
            const raw = await this.storageAdapter.getItem(SessionRecoveryManager.STORAGE_KEY);
            if (!raw)
                return null;
            const data = JSON.parse(raw);
            if (Date.now() > data.expiresAt) {
                this.logger.info(`Recovery token expired for userId '${data.userId}'. Clearing.`);
                await this.clearRecoveryToken();
                return null;
            }
            this.logger.info(`Found valid cold recovery token for userId '${data.userId}'`);
            return data;
        }
        catch (err) {
            this.logger.warn(`Error reading recovery session: ${err}`);
            return null;
        }
    }
    /**
     * Clears saved recovery session data.
     */
    async clearRecoveryToken() {
        try {
            await this.storageAdapter.removeItem(SessionRecoveryManager.STORAGE_KEY);
            this.logger.info('Cleared recovery token storage.');
        }
        catch (err) {
            this.logger.warn(`Failed to clear recovery token: ${err}`);
        }
    }
}
//# sourceMappingURL=SessionRecoveryManager.js.map