import type { RawAppTriggerEvent, JoinRequest } from '../types/index.js';
import { InvitationService } from '../social/InvitationService.js';
import type { IHostManager } from '../host/IHostManager.js';
export interface JoinPipelineResult {
    success: boolean;
    requestId: string;
    joinRequest?: JoinRequest;
    errorCode?: string;
    errorMessage?: string;
}
/**
 * @deprecated
 * Room ownership belongs to the game implementation.
 * The SDK does not own, generate, or manage Room IDs, handshakes, or joining pipelines.
 * This class is retained for backwards compatibility only.
 */
export declare class JoinPipelineManager {
    private readonly host;
    private readonly invitationService;
    private readonly currentSdkVersion;
    private readonly currentProtocolVersion;
    private readonly logger;
    constructor(host: IHostManager, invitationService: InvitationService, currentSdkVersion?: string, currentProtocolVersion?: number);
    /**
     * Main entry point for processing raw trigger events delivered by Wacharlo App.
     */
    processRawTrigger(rawEvent: RawAppTriggerEvent, gameId: string, gameVersion?: string): Promise<JoinPipelineResult>;
    /**
     * Internal Handshake and Version Negotiation implementation.
     */
    private performHandshake;
}
//# sourceMappingURL=JoinPipelineManager.d.ts.map