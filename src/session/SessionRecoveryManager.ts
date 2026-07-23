import type { ISessionStorageAdapter } from '../types/index.js';
import { LocalStorageAdapter } from './StorageAdapter.js';
import { Logger } from '../logger/Logger.js';

export interface RecoverySessionData {
  recoveryToken: string;
  gameId: string;
  inviteId: string;
  userId: string;
  savedAt: number;
  expiresAt: number;
  payload?: Record<string, unknown>;
}

export class SessionRecoveryManager {
  private readonly logger = new Logger('SessionRecoveryManager');
  private static readonly STORAGE_KEY = '__wacha_session_recovery_token__';
  private readonly ttlMs: number;

  constructor(
    private readonly storageAdapter: ISessionStorageAdapter = new LocalStorageAdapter(),
    ttlMinutes: number = 5,
  ) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Persists a cold recovery token and session metadata securely via ISessionStorageAdapter.
   */
  public async saveRecoveryToken(
    recoveryToken: string,
    gameId: string,
    inviteId: string,
    userId: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const now = Date.now();
    const data: RecoverySessionData = {
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
    } catch (err) {
      this.logger.warn(`Failed to persist recovery token: ${err}`);
    }
  }

  /**
   * Retrieves and validates active recovery token if within the cold recovery window.
   */
  public async getRecoverySession(): Promise<RecoverySessionData | null> {
    try {
      const raw = await this.storageAdapter.getItem(SessionRecoveryManager.STORAGE_KEY);
      if (!raw) return null;

      const data: RecoverySessionData = JSON.parse(raw);
      if (Date.now() > data.expiresAt) {
        this.logger.info(`Recovery token expired for userId '${data.userId}'. Clearing.`);
        await this.clearRecoveryToken();
        return null;
      }

      this.logger.info(`Found valid cold recovery token for userId '${data.userId}'`);
      return data;
    } catch (err) {
      this.logger.warn(`Error reading recovery session: ${err}`);
      return null;
    }
  }

  /**
   * Clears saved recovery session data.
   */
  public async clearRecoveryToken(): Promise<void> {
    try {
      await this.storageAdapter.removeItem(SessionRecoveryManager.STORAGE_KEY);
      this.logger.info('Cleared recovery token storage.');
    } catch (err) {
      this.logger.warn(`Failed to clear recovery token: ${err}`);
    }
  }
}
