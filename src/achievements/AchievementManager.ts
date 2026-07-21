import type { IAchievementManager } from './IAchievementManager';
import { Logger } from '../logger/Logger';

export interface IAchievementEventEmitter {
  emit<T = unknown>(event: any, payload?: T): void;
}

/**
 * AchievementManager
 *
 * Tracks which achievements have been unlocked in this session.
 */
export class AchievementManager implements IAchievementManager {
  private readonly logger = new Logger('AchievementManager');
  private sessionUnlocks: string[] = [];

  constructor(private readonly events?: IAchievementEventEmitter) {}

  public unlock(achievementId: string): void {
    if (this.sessionUnlocks.includes(achievementId)) {
      this.logger.warn(`Achievement "${achievementId}" was already unlocked this session — ignoring duplicate.`);
      return;
    }

    this.sessionUnlocks.push(achievementId);
    this.logger.info(`Achievement unlocked: ${achievementId}`);

    if (this.events) {
      this.events.emit('ACHIEVEMENT_UNLOCKED', { achievementId });
    }
  }

  public getSessionUnlocks(): string[] {
    return [...this.sessionUnlocks];
  }

  public reset(): void {
    this.sessionUnlocks = [];
    this.logger.info('Achievement session list reset.');
  }
}
