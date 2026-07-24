import { SDKEvent } from '../types/index';
import { Logger } from '../logger/Logger';
/**
 * SocialManager
 *
 * Implementation of `sdk.social`.
 * Dedicated strictly to user-facing platform social actions.
 */
export class SocialManager {
    host;
    logger = new Logger('SocialManager');
    constructor(host) {
        this.host = host;
    }
    async inviteFriend(roomId, payload) {
        if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
            this.logger.warn('inviteFriend() called with empty or invalid roomId.');
            throw new Error('SocialManager.inviteFriend: roomId must be a non-empty string.');
        }
        this.logger.info(`sdk.social.inviteFriend for roomId: ${roomId}`);
        this.host.emit(SDKEvent.INVITE_FRIEND, {
            roomId: roomId.trim(),
            ...payload,
        }, roomId.trim());
    }
    async shareRoom(roomId, payload) {
        if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
            this.logger.warn('shareRoom() called with empty or invalid roomId.');
            throw new Error('SocialManager.shareRoom: roomId must be a non-empty string.');
        }
        this.logger.info(`sdk.social.shareRoom for roomId: ${roomId}`);
        this.host.emit(SDKEvent.SHARE_ROOM, {
            roomId: roomId.trim(),
            ...payload,
        }, roomId.trim());
    }
}
//# sourceMappingURL=SocialManager.js.map