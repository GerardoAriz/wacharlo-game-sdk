import type { IGameDataManager } from './IGameDataManager';
import type { SDKGameData } from '../types/index';
import { Logger } from '../logger/Logger';

/**
 * GameDataManager
 *
 * The SDK's game data communication layer.
 * Caches the snapshot and merges reported fields incrementally.
 */
export class GameDataManager implements IGameDataManager {
  private readonly logger = new Logger('GameDataManager');
  private snapshot: Partial<SDKGameData> | null = null;

  public report(data: Partial<SDKGameData>): void {
    this.snapshot = {
      ...this.snapshot,
      ...data,
    };
    this.logger.debug('Game data reported', data);
  }

  public getLastSnapshot(): Readonly<Partial<SDKGameData>> | null {
    return this.snapshot ? Object.freeze({ ...this.snapshot }) : null;
  }

  public reset(): void {
    this.snapshot = null;
    this.logger.info('Game data snapshot reset.');
  }
}
