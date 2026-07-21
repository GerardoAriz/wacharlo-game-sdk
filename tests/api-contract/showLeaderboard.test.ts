/**
 * API Contract Tests — sdk.showLeaderboard()
 *
 * Verifies:
 *   - showLeaderboard() exists as a callable function
 *   - Calling showLeaderboard() before initialize() logs a warning and is a safe no-op
 *   - Calling showLeaderboard() after initialize() dispatches a SHOW_LEADERBOARD event
 *   - Message envelope follows standard pattern (event: 'SHOW_LEADERBOARD', gameId, sessionId, payload)
 *   - Does NOT render UI or mutate game data/score state
 *   - Can be called before session start, during an active session, or after gameOver()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSDK, Logger } from '../../src/index';
import type { GameConfig } from '../../src/index';
import { MockTransport } from '../../src/transport/MockTransport';

const BASE_CONFIG: GameConfig = {
  gameSlug:             'test-game',
  gameVersion:          '1.0.0',
  minSDKVersion:        '0.1.0',
  supportsLeaderboard:  true,
  supportsAchievements: false,
  supportsCloudSave:    false,
  supportsXP:           false,
};

describe('sdk.showLeaderboard()', () => {

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'info').mockImplementation(() => {});
  });

  it('exists as a callable function', () => {
    const mockTransport = new MockTransport();
    const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
    expect(typeof sdk.showLeaderboard).toBe('function');
  });

  it('logs a warning and does NOT send event if called before initialize()', () => {
    const mockTransport = new MockTransport();
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });

    sdk.showLeaderboard();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('showLeaderboard() called before initialize()'));
    expect(mockTransport.sentMessages).toHaveLength(0);
  });

  it('dispatches SHOW_LEADERBOARD event envelope correctly after initialize()', () => {
    const mockTransport = new MockTransport();
    const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
    sdk.initialize();

    mockTransport.sentMessages = []; // Clear INITIALIZE message

    sdk.showLeaderboard();

    expect(mockTransport.sentMessages).toHaveLength(1);
    const msg = mockTransport.sentMessages[0];

    expect(msg.event).toBe('SHOW_LEADERBOARD');
    expect(msg.type).toBe('SHOW_LEADERBOARD');
    expect(msg.gameId).toBe('test-game');
    expect(msg.sessionId).toBe(''); // No session started yet
    expect(msg.payload).toEqual({});
  });

  it('includes active sessionId when called during an active session', () => {
    const mockTransport = new MockTransport();
    const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
    sdk.initialize();
    sdk.startSession();

    mockTransport.sentMessages = []; // Clear previous messages

    sdk.showLeaderboard();

    expect(mockTransport.sentMessages).toHaveLength(1);
    const msg = mockTransport.sentMessages[0];

    expect(msg.event).toBe('SHOW_LEADERBOARD');
    expect(msg.sessionId).not.toBe('');
    expect(typeof msg.sessionId).toBe('string');
  });

  it('allows passing custom payload parameter to host', () => {
    const mockTransport = new MockTransport();
    const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
    sdk.initialize();

    mockTransport.sentMessages = [];

    sdk.showLeaderboard({ filter: 'weekly' });

    expect(mockTransport.sentMessages).toHaveLength(1);
    const msg = mockTransport.sentMessages[0];

    expect(msg.event).toBe('SHOW_LEADERBOARD');
    expect(msg.payload).toEqual({ filter: 'weekly' });
  });

  it('can be called after gameOver() without throwing errors', () => {
    const mockTransport = new MockTransport();
    const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
    sdk.initialize();
    sdk.startSession();
    sdk.gameOver({ score: 500 });

    mockTransport.sentMessages = [];

    expect(() => sdk.showLeaderboard()).not.toThrow();

    expect(mockTransport.sentMessages).toHaveLength(1);
    expect(mockTransport.sentMessages[0].event).toBe('SHOW_LEADERBOARD');
  });

  it('returns void (not a Promise or UI element)', () => {
    const mockTransport = new MockTransport();
    const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
    sdk.initialize();

    const result = sdk.showLeaderboard();
    expect(result).toBeUndefined();
  });
});
