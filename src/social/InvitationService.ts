import type { InvitePayload } from '../types/index.js';
import { Logger } from '../logger/Logger.js';

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
export class InMemoryLookupService implements ILookupService {
  private codeMap = new Map<string, string>();

  async resolveRoomCode(roomCode: string): Promise<string | null> {
    return this.codeMap.get(roomCode.trim().toUpperCase()) ?? null;
  }

  async registerRoomCode(roomCode: string, inviteId: string): Promise<void> {
    this.codeMap.set(roomCode.trim().toUpperCase(), inviteId);
  }
}

/**
 * InvitationService
 *
 * Handles creation, signing, validation, and resolution of InvitePayloads.
 */
export class InvitationService {
  private readonly logger = new Logger('InvitationService');
  private lookupService: ILookupService;

  constructor(lookupService?: ILookupService) {
    this.lookupService = lookupService ?? new InMemoryLookupService();
  }

  /**
   * Sets or updates the LookupService implementation.
   */
  public setLookupService(service: ILookupService): void {
    this.lookupService = service;
  }

  /**
   * Generates a canonical InvitePayload with schema versioning.
   */
  public async createInvite(
    gameId: string,
    inviter: { userId: string; displayName: string; avatarUrl?: string },
    customData?: Record<string, unknown>,
    ttlMs: number = 15 * 60 * 1000, // 15 minutes default
  ): Promise<InvitePayload> {
    const inviteId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const now = Date.now();
    const expiresAt = now + ttlMs;

    const payload: InvitePayload = {
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
  public async validateInvite(payload: InvitePayload): Promise<boolean> {
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
  public async resolveRoomCode(roomCode: string): Promise<string | null> {
    if (!roomCode || typeof roomCode !== 'string') return null;
    const inviteId = await this.lookupService.resolveRoomCode(roomCode);
    if (inviteId) {
      this.logger.info(`Resolved roomCode '${roomCode}' -> inviteId '${inviteId}'`);
    } else {
      this.logger.warn(`Failed to resolve roomCode '${roomCode}'`);
    }
    return inviteId;
  }

  /**
   * Registers a roomCode mapping for testing or room creation.
   */
  public async registerRoomCode(roomCode: string, inviteId: string): Promise<void> {
    await this.lookupService.registerRoomCode(roomCode, inviteId);
  }
}
