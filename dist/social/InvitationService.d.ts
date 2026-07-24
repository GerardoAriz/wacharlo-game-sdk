import type { InvitePayload } from '../types/index.js';
/**
 * Interface for decoupled roomCode to inviteId resolution service.
 * Implementations can be backed by Supabase, Redis, REST API, or Mock.
 */
export interface ILookupService {
    resolveRoomCode(roomCode: string): Promise<string | null>;
    registerRoomCode(roomCode: string, inviteId: string): Promise<void>;
}
/**
 * In-memory LookupService for standalone testing and development.
 */
export declare class InMemoryLookupService implements ILookupService {
    private codeMap;
    resolveRoomCode(roomCode: string): Promise<string | null>;
    registerRoomCode(roomCode: string, inviteId: string): Promise<void>;
}
/**
 * InvitationService
 *
 * @deprecated
 * Room ownership belongs to the game implementation.
 * The SDK does not own, generate, or manage Room IDs, invitation links, or code resolution.
 * This class is retained for backwards compatibility only.
 */
export declare class InvitationService {
    private readonly logger;
    private lookupService;
    constructor(lookupService?: ILookupService);
    /**
     * Sets or updates the LookupService implementation.
     */
    setLookupService(service: ILookupService): void;
    /**
     * Generates a canonical InvitePayload with schema versioning.
     */
    createInvite(gameId: string, inviter: {
        userId: string;
        displayName: string;
        avatarUrl?: string;
    }, customData?: Record<string, unknown>, ttlMs?: number): Promise<InvitePayload>;
    /**
     * Validates an InvitePayload against expiration and signature structure.
     */
    validateInvite(payload: InvitePayload): Promise<boolean>;
    /**
     * Resolves a roomCode to a canonical inviteId using the LookupService.
     */
    resolveRoomCode(roomCode: string): Promise<string | null>;
    /**
     * Registers a roomCode mapping for testing or room creation.
     */
    registerRoomCode(roomCode: string, inviteId: string): Promise<void>;
}
//# sourceMappingURL=InvitationService.d.ts.map