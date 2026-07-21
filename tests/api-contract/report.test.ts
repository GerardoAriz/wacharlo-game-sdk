/**
 * API Contract Tests — sdk.report()
 *
 * Verifies:
 *   - Method exists on the SDK instance
 *   - Accepts Partial<SDKGameData> (all fields optional)
 *   - Does not throw when called with an active session
 *   - Does not throw when called with an empty object
 *   - Returns void
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSDK } from '../../src/index.ts';
import type { GameConfig, SDKGameData } from '../../src/index.ts';

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

/** Returns an SDK that is initialized and has an active session. */
function readySDK(): GameSDK {
  const sdk = GameSDK.create(BASE_CONFIG);
  sdk.initialize();
  sdk.startSession();
  return sdk;
}

// ── report() ─────────────────────────────────────────────────────────────────

describe('sdk.report()', () => {

  beforeEach(() => {
    // Suppress expected "no active session" warnings in test output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('exists as a callable function', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(typeof sdk.report).toBe('function');
  });

  it('does not throw when called with an active session', () => {
    const sdk = readySDK();
    expect(() => sdk.report({ score: 100 })).not.toThrow();
  });

  it('accepts an empty partial (no fields required)', () => {
    const sdk = readySDK();
    expect(() => sdk.report({})).not.toThrow();
  });

  it('accepts every SDKGameData field', () => {
    const sdk = readySDK();
    const fullData: Partial<SDKGameData> = {
      score:      500,
      highScore:  1000,
      coins:      10,
      gems:       3,
      lives:      3,
      combo:      5,
      multiplier: 2,
      timer:      120,
      level:      4,
    };
    expect(() => sdk.report(fullData)).not.toThrow();
  });

  it('accepts individual fields independently (partial snapshot)', () => {
    const sdk = readySDK();
    expect(() => sdk.report({ score: 42 })).not.toThrow();
    expect(() => sdk.report({ coins: 7 })).not.toThrow();
    expect(() => sdk.report({ level: 3, combo: 8 })).not.toThrow();
  });

  it('can be called multiple times in a session without throwing', () => {
    const sdk = readySDK();
    expect(() => {
      sdk.report({ score: 10 });
      sdk.report({ score: 20 });
      sdk.report({ score: 30, coins: 5 });
    }).not.toThrow();
  });

  it('returns void (not a Promise, not a value)', () => {
    const sdk = readySDK();
    const result = sdk.report({ score: 1 });
    expect(result).toBeUndefined();
  });

  it('does not throw when called before session (guard is safe)', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();
    // No startSession() — SDK must warn but NOT throw
    expect(() => sdk.report({ score: 99 })).not.toThrow();
  });

});
