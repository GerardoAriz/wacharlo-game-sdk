import type {
  RawAppTriggerEvent,
  JoinRequest,
  HandshakeInitPayload,
  HandshakeAckPayload,
} from '../types/index.js';
import { SDKEvent } from '../types/index.js';
import { Logger } from '../logger/Logger.js';
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
export class JoinPipelineManager {
  private readonly logger = new Logger('JoinPipelineManager');

  constructor(
    private readonly host: IHostManager,
    private readonly invitationService: InvitationService,
    private readonly currentSdkVersion: string = '1.2.0',
    private readonly currentProtocolVersion: number = 1,
  ) {}

  /**
   * Main entry point for processing raw trigger events delivered by Wacharlo App.
   */
  public async processRawTrigger(
    rawEvent: RawAppTriggerEvent,
    gameId: string,
    gameVersion: string = '1.0.0',
  ): Promise<JoinPipelineResult> {
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Emit JOIN_PIPELINE_STARTED telemetry
    this.logger.info(`[${requestId}] Starting Join Pipeline for trigger: '${rawEvent.trigger}'`);
    this.host.emit(SDKEvent.JOIN_PIPELINE_STARTED, {
      requestId,
      trigger: rawEvent.trigger,
      timestamp: Date.now(),
    });

    try {
      // 2. Resolve inviteId based on trigger type
      let inviteId: string | null = null;

      if (rawEvent.trigger === 'room_code') {
        const roomCode = String(rawEvent.payload.roomCode || '');
        if (!roomCode) {
          throw new Error('ROOM_CODE_MISSING: Raw trigger payload missing roomCode');
        }
        // Resolution: roomCode -> LookupService -> inviteId
        inviteId = await this.invitationService.resolveRoomCode(roomCode);
        if (!inviteId) {
          throw new Error('INVITE_NOT_FOUND: Failed to resolve roomCode via LookupService');
        }
      } else if (rawEvent.payload.inviteId) {
        inviteId = String(rawEvent.payload.inviteId);
      } else {
        throw new Error('INVITE_ID_MISSING: Raw trigger payload missing inviteId');
      }

      // 3. Construct normalized JoinRequest
      const joinRequest: JoinRequest = {
        requestId,
        trigger: rawEvent.trigger,
        inviteId,
        gameId,
        player: {
          userId: rawEvent.userProfile.userId,
          displayName: rawEvent.userProfile.displayName,
          avatarUrl: rawEvent.userProfile.avatarUrl,
          authToken: rawEvent.userAuthToken,
        },
        recoveryToken: typeof rawEvent.payload.recoveryToken === 'string' ? rawEvent.payload.recoveryToken : undefined,
        clientInfo: {
          sdkVersion: this.currentSdkVersion,
          gameVersion,
          protocolVersion: this.currentProtocolVersion,
        },
        timestamp: rawEvent.timestamp || Date.now(),
      };

      // 4. Perform Handshake & Version Negotiation
      const handshakeAck = await this.performHandshake(joinRequest.clientInfo, gameId);
      if (handshakeAck.status !== 'ACCEPTED') {
        throw new Error(`VERSION_MISMATCH: ${handshakeAck.reason || 'Client and Host version incompatible'}`);
      }

      // 5. Emit JOIN_PIPELINE_FINISHED (Success) telemetry
      this.logger.info(`[${requestId}] Join Pipeline completed successfully for inviteId: '${inviteId}'`);
      this.host.emit(SDKEvent.JOIN_PIPELINE_FINISHED, {
        requestId,
        status: 'SUCCESS',
        inviteId,
        timestamp: Date.now(),
      });

      return {
        success: true,
        requestId,
        joinRequest,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCode = errorMessage.split(':')[0] || 'JOIN_PIPELINE_ERROR';

      this.logger.error(`[${requestId}] Join Pipeline failed: ${errorMessage}`);

      // 6. Emit JOIN_PIPELINE_FINISHED (Failure) telemetry
      this.host.emit(SDKEvent.JOIN_PIPELINE_FINISHED, {
        requestId,
        status: 'FAILURE',
        errorCode,
        errorMessage,
        timestamp: Date.now(),
      });

      return {
        success: false,
        requestId,
        errorCode,
        errorMessage,
      };
    }
  }

  /**
   * Internal Handshake and Version Negotiation implementation.
   */
  private async performHandshake(
    clientInfo: JoinRequest['clientInfo'],
    gameId: string,
  ): Promise<HandshakeAckPayload> {
    const handshakeInit: HandshakeInitPayload = {
      sdkVersion: clientInfo.sdkVersion,
      gameId,
      gameVersion: clientInfo.gameVersion,
      protocolVersion: clientInfo.protocolVersion,
    };

    this.logger.info(`Performing Handshake: SDK v${handshakeInit.sdkVersion}, Protocol v${handshakeInit.protocolVersion}`);
    this.host.emit(SDKEvent.HANDSHAKE_INIT, handshakeInit as unknown as Record<string, unknown>);

    // Basic version validation rule (can be extended with custom compatibility matrix)
    if (clientInfo.protocolVersion < 1) {
      return {
        status: 'REJECTED',
        errorCode: 'VERSION_MISMATCH',
        reason: 'Client protocol version is deprecated.',
      };
    }

    const ack: HandshakeAckPayload = { status: 'ACCEPTED' };
    this.host.emit(SDKEvent.HANDSHAKE_ACK, ack as unknown as Record<string, unknown>);
    return ack;
  }
}
