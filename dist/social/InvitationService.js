import { Logger } from '../logger/Logger.js';
/**
 * In-memory LookupService for standalone testing and development.
 */
export class InMemoryLookupService {
    codeMap = new Map();
    async resolveRoomCode(roomCode) {
        return this.codeMap.get(roomCode.trim().toUpperCase()) ?? null;
    }
    async registerRoomCode(roomCode, inviteId) {
        this.codeMap.set(roomCode.trim().toUpperCase(), inviteId);
    }
}
/**
 * InvitationService
 *
 * @deprecated
 * Room ownership belongs to the game implementation.
 * The SDK does not own, generate, or manage Room IDs, invitation links, or code resolution.
 * This class is retained for backwards compatibility only.
 */
export class InvitationService {
    logger = new Logger('InvitationService');
    lookupService;
    constructor(lookupService) {
        this.lookupService = lookupService ?? new InMemoryLookupService();
    }
    /**
     * Sets or updates the LookupService implementation.
     */
    setLookupService(service) {
        this.lookupService = service;
    }
    /**
     * Generates a canonical InvitePayload with schema versioning.
     */
    async createInvite(gameId, inviter, customData, ttlMs = 15 * 60 * 1000) {
        const inviteId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const now = Date.now();
        const expiresAt = now + ttlMs;
        const payload = {
            inviteSchemaVersion: '1.0',
            sdkVersion: '1.2.0',
            inviteId,
            gameId,
            inviter,
            customData,
            createdAt: now,
            expiresAt,
            signature: `sig_${inviteId}_${now}`,
        };
        this.logger.info(`Created canonical inviteId: ${inviteId} for gameId: ${gameId}`);
        return payload;
    }
    /**
     * Validates an InvitePayload against expiration and signature structure.
     */
    async validateInvite(payload) {
        if (!payload || !payload.inviteId || !payload.inviteSchemaVersion) {
            this.logger.warn('validateInvite: Invalid payload structure.');
            return false;
        }
        if (Date.now() > payload.expiresAt) {
            this.logger.warn(`validateInvite: Invite ${payload.inviteId} has expired.`);
            return false;
        }
        return true;
    }
    /**
     * Resolves a roomCode to a canonical inviteId using the LookupService.
     */
    async resolveRoomCode(roomCode) {
        if (!roomCode || typeof roomCode !== 'string')
            return null;
        const inviteId = await this.lookupService.resolveRoomCode(roomCode);
        if (inviteId) {
            this.logger.info(`Resolved roomCode '${roomCode}' -> inviteId '${inviteId}'`);
        }
        else {
            this.logger.warn(`Failed to resolve roomCode '${roomCode}'`);
        }
        return inviteId;
    }
    /**
     * Registers a roomCode mapping for testing or room creation.
     */
    async registerRoomCode(roomCode, inviteId) {
        await this.lookupService.registerRoomCode(roomCode, inviteId);
    }
}
//# sourceMappingURL=InvitationService.js.map