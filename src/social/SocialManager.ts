import type { ISocialManager } from './ISocialManager';
import type { IHostManager } from '../host/IHostManager';
import { SDKEvent } from '../types/index';
import { Logger } from '../logger/Logger';

/**
 * SocialManager
 *
 * Implementation of `sdk.social`.
 * Dedicated strictly to user-facing platform social actions.
 */
export class SocialManager implements ISocialManager {
  private readonly logger = new Logger('SocialManager');

  constructor(private readonly host: IHostManager) {}

  public async inviteFriend(roomId: string, payload?: Record<string, unknown>): Promise<void> {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      this.logger.warn('inviteFriend() called with empty or invalid roomId.');
      throw new Error('SocialManager.inviteFriend: roomId must be a non-empty string.');
    }

    this.logger.info(`sdk.social.inviteFriend for roomId: ${roomId}`);
    this.host.emit(
      SDKEvent.INVITE_FRIEND,
      {
        roomId: roomId.trim(),
        ...payload,
      },
      roomId.trim(),
    );
  }

  public async shareRoom(roomId: string, payload?: Record<string, unknown>): Promise<void> {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      this.logger.warn('shareRoom() called with empty or invalid roomId.');
      throw new Error('SocialManager.shareRoom: roomId must be a non-empty string.');
    }

    this.logger.info(`sdk.social.shareRoom for roomId: ${roomId}`);
    this.host.emit(
      SDKEvent.SHARE_ROOM,
      {
        roomId: roomId.trim(),
        ...payload,
      },
      roomId.trim(),
    );
  }
}
