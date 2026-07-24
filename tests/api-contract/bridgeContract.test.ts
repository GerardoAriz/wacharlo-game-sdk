import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameSDK } from '../../src/sdk/GameSDK';
import { SDKEvent } from '../../src/types/index';
import type { GameConfig } from '../../src/config/GameConfig';
import type { SDKMessageType } from '../../src/types/index';
import { MockTransport } from '../../src/transport/MockTransport';
import { SDK_VERSION } from '../../src/version/index';

const BASE_CONFIG: GameConfig = {
  gameSlug: 'generic-multiplayer-game',
  gameVersion: '1.0.0',
  minSDKVersion: '2.0.0-rc.1',
  supportsLeaderboard: true,
  supportsAchievements: false,
  supportsCloudSave: false,
  supportsXP: false,
};

describe('Bi-directional Integration Contract Test (Game <-> SDK <-> Host)', () => {
  let mockTransport: MockTransport;
  let sdk: GameSDK;
  let outgoingMessages: SDKMessageType[];

  beforeEach(() => {
    outgoingMessages = [];
    mockTransport = new MockTransport();

    // Intercept messages sent from SDK over transport to simulate Host
    vi.spyOn(mockTransport, 'send').mockImplementation((msg: SDKMessageType) => {
      outgoingMessages.push(msg);
    });

    sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
    sdk.initialize();
    sdk.startSession();
  });

  afterEach(() => {
    sdk.dispose();
    vi.restoreAllMocks();
  });

  it('SDK version matches release candidate 2.0.0-rc.1', () => {
    expect(sdk.version).toBe('2.0.0-rc.1');
    expect(SDK_VERSION).toBe('2.0.0-rc.1');
  });

  describe('Outbound Path: Game -> SDK -> Host (WacharloApp)', () => {
    it('transmits ROOM_CREATED event cleanly with roomId and payload to Host', () => {
      const payload = {
        hostId: 'user-101',
        maxPlayers: 2,
        gameMode: 'versus',
      };
      const roomId = 'room-abc-123';

      sdk.host.emit(SDKEvent.ROOM_CREATED, payload, roomId);

      const lastMsg = outgoingMessages[outgoingMessages.length - 1];
      expect(lastMsg).toBeDefined();
      expect(lastMsg.event).toBe(SDKEvent.ROOM_CREATED);
      expect(lastMsg.roomId).toBe(roomId);
      expect(lastMsg.gameId).toBe('generic-multiplayer-game');
      expect(lastMsg.sdkVersion).toBe('2.0.0-rc.1');
      expect(lastMsg.payload).toEqual(payload);
    });

    it('transmits MATCH_STARTED and MATCH_FINISHED events with complete payload integrity', () => {
      const roomId = 'room-xyz-789';

      sdk.host.emit(SDKEvent.MATCH_STARTED, { seed: 12345, map: 'arena_1' }, roomId);
      let lastMsg = outgoingMessages[outgoingMessages.length - 1];
      expect(lastMsg.event).toBe(SDKEvent.MATCH_STARTED);
      expect(lastMsg.roomId).toBe(roomId);
      expect(lastMsg.payload).toEqual({ seed: 12345, map: 'arena_1' });

      sdk.host.emit(SDKEvent.MATCH_FINISHED, { winnerId: 'user-101', durationMs: 45000 }, roomId);
      lastMsg = outgoingMessages[outgoingMessages.length - 1];
      expect(lastMsg.event).toBe(SDKEvent.MATCH_FINISHED);
      expect(lastMsg.roomId).toBe(roomId);
      expect(lastMsg.payload).toEqual({ winnerId: 'user-101', durationMs: 45000 });
    });
  });

  describe('Inbound Path: Host (WacharloApp) -> SDK -> Game', () => {
    it('dispatches incoming Host events directly to Game event listeners', () => {
      const receivedEvents: Array<{ event: string; payload: unknown }> = [];

      sdk.on(SDKEvent.PLAYER_JOINED, (payload) => {
        receivedEvents.push({ event: SDKEvent.PLAYER_JOINED, payload });
      });

      sdk.on(SDKEvent.MATCH_READY, (payload) => {
        receivedEvents.push({ event: SDKEvent.MATCH_READY, payload });
      });

      // Simulate Host sending messages into the SDK via transport message handler
      const incomingMessage1: SDKMessageType = {
        event: SDKEvent.PLAYER_JOINED,
        type: SDKEvent.PLAYER_JOINED,
        gameId: 'generic-multiplayer-game',
        gameVersion: '1.0.0',
        sdkVersion: '2.0.0-rc.1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        device: { type: 'mobile', os: 'iOS', language: 'es', pixelRatio: 3 },
        data: {},
        roomId: 'room-abc-123',
        payload: { userId: 'user-202', displayName: 'PlayerTwo' },
      };

      const incomingMessage2: SDKMessageType = {
        event: SDKEvent.MATCH_READY,
        type: SDKEvent.MATCH_READY,
        gameId: 'generic-multiplayer-game',
        gameVersion: '1.0.0',
        sdkVersion: '2.0.0-rc.1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        device: { type: 'mobile', os: 'iOS', language: 'es', pixelRatio: 3 },
        data: {},
        roomId: 'room-abc-123',
        payload: { readyPlayers: ['user-101', 'user-202'] },
      };

      mockTransport.mockReceive(incomingMessage1);
      mockTransport.mockReceive(incomingMessage2);

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0]).toEqual({
        event: SDKEvent.PLAYER_JOINED,
        payload: { userId: 'user-202', displayName: 'PlayerTwo' },
      });
      expect(receivedEvents[1]).toEqual({
        event: SDKEvent.MATCH_READY,
        payload: { readyPlayers: ['user-101', 'user-202'] },
      });
    });
  });

  describe('Full Standardized Multiplayer Lifecycle Event Suite', () => {
    it('supports all generic multiplayer events without modification or payload loss', () => {
      const allStandardEvents = [
        SDKEvent.ROOM_CREATED,
        SDKEvent.ROOM_JOINED,
        SDKEvent.PLAYER_JOINED,
        SDKEvent.PLAYER_LEFT,
        SDKEvent.MATCH_READY,
        SDKEvent.MATCH_STARTED,
        SDKEvent.MATCH_FINISHED,
        SDKEvent.ROOM_DESTROYED,
      ];

      const testPayload = { testKey: 'genericValue', count: 42 };
      const roomId = 'room-contract-999';

      allStandardEvents.forEach((eventType) => {
        sdk.host.emit(eventType, testPayload, roomId);
        const lastMsg = outgoingMessages[outgoingMessages.length - 1];

        expect(lastMsg.event).toBe(eventType);
        expect(lastMsg.roomId).toBe(roomId);
        expect(lastMsg.payload).toEqual(testPayload);
      });

      expect(outgoingMessages.length).toBeGreaterThanOrEqual(allStandardEvents.length);
    });
  });
});
