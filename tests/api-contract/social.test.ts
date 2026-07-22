import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSDK, SDKEvent } from '../../src/index';
import type { GameConfig, SDKMessageType } from '../../src/types/index';
import { MockTransport } from '../../src/transport/MockTransport';

const BASE_CONFIG: GameConfig = {
  gameSlug: 'test-game',
  gameVersion: '1.0.0',
  minSDKVersion: '1.0.0',
  supportsLeaderboard: true,
  supportsAchievements: true,
};

describe('SDK v1.1 Social Platform & Host API', () => {
  let transport: MockTransport;
  let sdk: GameSDK;

  beforeEach(() => {
    transport = new MockTransport();
    sdk = GameSDK.create(BASE_CONFIG, { transport });
    sdk.initialize();
  });

  describe('SDKEvent Categorization', () => {
    it('defines ROOM_* events', () => {
      expect(SDKEvent.ROOM_CREATED).toBe('ROOM_CREATED');
      expect(SDKEvent.ROOM_JOINED).toBe('ROOM_JOINED');
      expect(SDKEvent.ROOM_LEFT).toBe('ROOM_LEFT');
      expect(SDKEvent.ROOM_CLOSED).toBe('ROOM_CLOSED');
    });

    it('defines MATCH_* events', () => {
      expect(SDKEvent.MATCH_PREPARING).toBe('MATCH_PREPARING');
      expect(SDKEvent.COUNTDOWN_STARTED).toBe('COUNTDOWN_STARTED');
      expect(SDKEvent.MATCH_STARTED).toBe('MATCH_STARTED');
      expect(SDKEvent.MATCH_FINISHED).toBe('MATCH_FINISHED');
      expect(SDKEvent.REMATCH_REQUESTED).toBe('REMATCH_REQUESTED');
      expect(SDKEvent.REMATCH_ACCEPTED).toBe('REMATCH_ACCEPTED');
    });

    it('defines PLAYER_* events', () => {
      expect(SDKEvent.PLAYER_JOINED).toBe('PLAYER_JOINED');
      expect(SDKEvent.PLAYER_LEFT).toBe('PLAYER_LEFT');
      expect(SDKEvent.PLAYER_READY).toBe('PLAYER_READY');
      expect(SDKEvent.SCORE_UPDATED).toBe('SCORE_UPDATED');
      expect(SDKEvent.PLAYER_DIED).toBe('PLAYER_DIED');
    });

    it('defines SOCIAL_* platform actions', () => {
      expect(SDKEvent.INVITE_FRIEND).toBe('INVITE_FRIEND');
      expect(SDKEvent.SHARE_ROOM).toBe('SHARE_ROOM');
    });
  });

  describe('sdk.host Communication API', () => {
    it('emits events using standardized envelope format', () => {
      sdk.startSession();

      const lastSentCount = transport.sentMessages.length;
      sdk.host.emit(SDKEvent.MATCH_STARTED, { map: 'jungle' }, 'room_123');

      expect(transport.sentMessages.length).toBe(lastSentCount + 1);

      const msg: SDKMessageType = transport.sentMessages[transport.sentMessages.length - 1];
      expect(msg.event).toBe('MATCH_STARTED');
      expect(msg.roomId).toBe('room_123');
      expect(msg.payload).toEqual({ map: 'jungle' });
      expect(msg.timestamp).toBeGreaterThan(0);
    });

    it('notifies local subscribers on sdk.host.emit()', () => {
      const listener = vi.fn();
      sdk.host.on(SDKEvent.PLAYER_JOINED, listener);

      sdk.host.emit(SDKEvent.PLAYER_JOINED, { playerId: 'player_1' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ playerId: 'player_1' });
    });

    it('unsubscribes listeners cleanly via off() and cleanup function', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = sdk.host.on(SDKEvent.MATCH_FINISHED, listener1);
      sdk.host.on(SDKEvent.MATCH_FINISHED, listener2);

      sdk.host.emit(SDKEvent.MATCH_FINISHED, { winner: 'p1' });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsub1();
      sdk.host.emit(SDKEvent.MATCH_FINISHED, { winner: 'p2' });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);

      sdk.host.off(SDKEvent.MATCH_FINISHED, listener2);
      sdk.host.emit(SDKEvent.MATCH_FINISHED, { winner: 'p3' });
      expect(listener2).toHaveBeenCalledTimes(2);
    });
  });

  describe('sdk.social User-Facing Platform Actions API', () => {
    it('dispatches INVITE_FRIEND platform action via sdk.social.inviteFriend()', async () => {
      await sdk.social.inviteFriend('room_99');

      const msg = transport.sentMessages[transport.sentMessages.length - 1];
      expect(msg.event).toBe('INVITE_FRIEND');
      expect(msg.roomId).toBe('room_99');
      expect(msg.payload).toEqual({ roomId: 'room_99' });
    });

    it('dispatches SHARE_ROOM platform action via sdk.social.shareRoom()', async () => {
      await sdk.social.shareRoom('room_99', { title: 'Join my game!' });

      const msg = transport.sentMessages[transport.sentMessages.length - 1];
      expect(msg.event).toBe('SHARE_ROOM');
      expect(msg.roomId).toBe('room_99');
      expect(msg.payload).toEqual({ roomId: 'room_99', title: 'Join my game!' });
    });

    it('throws error when roomId is invalid', async () => {
      await expect(sdk.social.inviteFriend('')).rejects.toThrow();
      await expect(sdk.social.shareRoom('   ')).rejects.toThrow();
    });
  });
});
