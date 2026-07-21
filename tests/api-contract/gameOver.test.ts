/**
 * API Contract Tests — sdk.gameOver()
 *
 * Verifies:
 *   - Method exists on the SDK instance
 *   - Can be called with no arguments
 *   - Can be called with a full GameResult
 *   - Only ends the session ONCE per session (second call is a safe no-op)
 *   - Returns void
 *   - Never throws
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSDK, Logger } from '../../src/index.ts';
import type { GameConfig, GameResult } from '../../src/index.ts';

// ── Shared fixture ───────────────────────────────────────────────────────────

const BASE_CONFIG: GameConfig = {
  gameSlug:             'test-game',
  gameVersion:          '1.0.0',
  minSDKVersion:        '0.1.0',
  supportsLeaderboard:  false,
  supportsAchievements: false,
  supportsCloudSave:    false,
  supportsXP:           false,
};

function readySDK(): GameSDK {
  const sdk = GameSDK.create(BASE_CONFIG);
  sdk.initialize();
  sdk.startSession();
  return sdk;
}

// ── gameOver() ────────────────────────────────────────────────────────────────

describe('sdk.gameOver()', () => {

  beforeEach(() => {
    // Suppress expected "session already ended" warnings in test output.
    // Logger methods are stubs (Phase 3 TODOs) that don't call console.warn yet.
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('exists as a callable function', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(typeof sdk.gameOver).toBe('function');
  });

  it('does not throw when called with no arguments', () => {
    const sdk = readySDK();
    expect(() => sdk.gameOver()).not.toThrow();
  });

  it('does not throw when called with an empty result object', () => {
    const sdk = readySDK();
    expect(() => sdk.gameOver({})).not.toThrow();
  });

  it('does not throw when called with a score', () => {
    const sdk = readySDK();
    expect(() => sdk.gameOver({ score: 4250 })).not.toThrow();
  });

  it('does not throw when called with a full GameResult', () => {
    const sdk = readySDK();
    const result: GameResult = {
      score:  4250,
      reason: 'player_death',
      data:   { score: 4250, coins: 18, combo: 7, level: 3 },
    };
    expect(() => sdk.gameOver(result)).not.toThrow();
  });

  it('second call in the same session is a safe no-op (does not throw)', () => {
    const sdk = readySDK();
    sdk.gameOver({ score: 100 });
    expect(() => sdk.gameOver({ score: 200 })).not.toThrow();
  });

  it('emits a warning when called a second time (once-per-session guard)', () => {
    const sdk = readySDK();
    // Logger methods are stubs (Phase 3 TODOs) — spy on Logger.prototype.warn
    // rather than console.warn, which is never called by the stub.
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    sdk.gameOver({ score: 100 });
    sdk.gameOver({ score: 200 }); // should trigger warn path

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('can be called again after a new startSession()', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();

    // Session 1
    sdk.startSession();
    expect(() => sdk.gameOver({ score: 100 })).not.toThrow();

    // Session 2 — new session resets the once-per-session guard
    sdk.startSession();
    expect(() => sdk.gameOver({ score: 200 })).not.toThrow();
  });

  it('does not throw when called with no active session (guard is safe)', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();
    // No startSession() — must warn but NOT throw
    expect(() => sdk.gameOver({ score: 0 })).not.toThrow();
  });

  it('returns void (not a Promise, not a value)', () => {
    const sdk = readySDK();
    const result = sdk.gameOver({ score: 1 });
    expect(result).toBeUndefined();
  });

});
