import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  JoinPipelineManager,
  InvitationService,
  InMemoryLookupService,
  SessionRecoveryManager,
  MemoryStorageAdapter,
  SDKEvent,
  RawAppTriggerEvent,
} from '../../src/index.js';

describe('V1.2 Architecture: JoinPipelineManager & Session Recovery', () => {
  let mockHost: any;
  let lookupService: InMemoryLookupService;
  let invitationService: InvitationService;
  let joinPipeline: JoinPipelineManager;
  let emittedEvents: Array<{ event: string; payload: any }>;

  beforeEach(() => {
    emittedEvents = [];
    mockHost = {
      emit: vi.fn((event: string, payload: any) => {
        emittedEvents.push({ event, payload });
      }),
    };

    lookupService = new InMemoryLookupService();
    invitationService = new InvitationService(lookupService);
    joinPipeline = new JoinPipelineManager(mockHost, invitationService, '1.2.0', 1);
  });

  describe('JoinPipelineManager Triggers', () => {
    it('emits JOIN_PIPELINE_STARTED and JOIN_PIPELINE_FINISHED for deep_link trigger', async () => {
      const rawTrigger: RawAppTriggerEvent = {
        trigger: 'deep_link',
        payload: { inviteId: 'test-canonical-invite-uuid' },
        userAuthToken: 'token-abc-123',
        userProfile: { userId: 'usr-1', displayName: 'Player One' },
        timestamp: Date.now(),
      };

      const result = await joinPipeline.processRawTrigger(rawTrigger, 'wacha-rope-rush');

      expect(result.success).toBe(true);
      expect(result.joinRequest).toBeDefined();
      expect(result.joinRequest?.inviteId).toBe('test-canonical-invite-uuid');
      expect(result.joinRequest?.player.userId).toBe('usr-1');

      // Verify Telemetry Events
      const startedEvent = emittedEvents.find((e) => e.event === SDKEvent.JOIN_PIPELINE_STARTED);
      const finishedEvent = emittedEvents.find((e) => e.event === SDKEvent.JOIN_PIPELINE_FINISHED);
      const handshakeInit = emittedEvents.find((e) => e.event === SDKEvent.HANDSHAKE_INIT);
      const handshakeAck = emittedEvents.find((e) => e.event === SDKEvent.HANDSHAKE_ACK);

      expect(startedEvent).toBeDefined();
      expect(startedEvent?.payload.trigger).toBe('deep_link');

      expect(finishedEvent).toBeDefined();
      expect(finishedEvent?.payload.status).toBe('SUCCESS');
      expect(finishedEvent?.payload.inviteId).toBe('test-canonical-invite-uuid');

      expect(handshakeInit).toBeDefined();
      expect(handshakeAck?.payload.status).toBe('ACCEPTED');
    });

    it('resolves roomCode via LookupService and processes join request', async () => {
      // Pre-register roomCode 'A7K9' -> 'invite-uuid-999' in LookupService
      await lookupService.registerRoomCode('A7K9', 'invite-uuid-999');

      const rawTrigger: RawAppTriggerEvent = {
        trigger: 'room_code',
        payload: { roomCode: 'a7k9' }, // lowercase test
        userAuthToken: 'token-xyz-456',
        userProfile: { userId: 'usr-2', displayName: 'Player Two' },
        timestamp: Date.now(),
      };

      const result = await joinPipeline.processRawTrigger(rawTrigger, 'wacha-rope-rush');

      expect(result.success).toBe(true);
      expect(result.joinRequest?.inviteId).toBe('invite-uuid-999');

      const finishedEvent = emittedEvents.find((e) => e.event === SDKEvent.JOIN_PIPELINE_FINISHED);
      expect(finishedEvent?.payload.status).toBe('SUCCESS');
      expect(finishedEvent?.payload.inviteId).toBe('invite-uuid-999');
    });

    it('emits JOIN_PIPELINE_FINISHED with status FAILURE if roomCode resolution fails', async () => {
      const rawTrigger: RawAppTriggerEvent = {
        trigger: 'room_code',
        payload: { roomCode: 'INVALID_CODE' },
        userAuthToken: 'token-xyz',
        userProfile: { userId: 'usr-3', displayName: 'Player Three' },
        timestamp: Date.now(),
      };

      const result = await joinPipeline.processRawTrigger(rawTrigger, 'wacha-rope-rush');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVITE_NOT_FOUND');

      const finishedEvent = emittedEvents.find((e) => e.event === SDKEvent.JOIN_PIPELINE_FINISHED);
      expect(finishedEvent).toBeDefined();
      expect(finishedEvent?.payload.status).toBe('FAILURE');
      expect(finishedEvent?.payload.errorCode).toBe('INVITE_NOT_FOUND');
    });
  });

  describe('SessionRecoveryManager', () => {
    it('persists and recovers cold session token via ISessionStorageAdapter', async () => {
      const storageAdapter = new MemoryStorageAdapter();
      const recoveryManager = new SessionRecoveryManager(storageAdapter, 5); // 5 mins

      await recoveryManager.saveRecoveryToken('rec-tok-123', 'wacha-rope-rush', 'invite-777', 'user-456');

      const session = await recoveryManager.getRecoverySession();
      expect(session).not.toBeNull();
      expect(session?.recoveryToken).toBe('rec-tok-123');
      expect(session?.inviteId).toBe('invite-777');
      expect(session?.userId).toBe('user-456');

      await recoveryManager.clearRecoveryToken();
      const clearedSession = await recoveryManager.getRecoverySession();
      expect(clearedSession).toBeNull();
    });
  });
});
