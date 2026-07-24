import type { ISocialManager } from './ISocialManager';
import type { IHostManager } from '../host/IHostManager';
/**
 * SocialManager
 *
 * Implementation of `sdk.social`.
 * Dedicated strictly to user-facing platform social actions.
 */
export declare class SocialManager implements ISocialManager {
    private readonly host;
    private readonly logger;
    constructor(host: IHostManager);
    inviteFriend(roomId: string, payload?: Record<string, unknown>): Promise<void>;
    shareRoom(roomId: string, payload?: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=SocialManager.d.ts.map