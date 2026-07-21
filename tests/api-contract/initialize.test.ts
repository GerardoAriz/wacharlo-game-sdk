/**
 * API Contract Tests — sdk.isInitialized() + sdk.initialize()
 *
 * Verifies:
 *   - isInitialized() returns false before initialize()
 *   - isInitialized() returns true after initialize()
 *   - initialize() can only succeed once (second call is a safe no-op)
 *   - initialize() never throws regardless of call order
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSDK, Logger } from '../../src/index.ts';
import type { GameConfig } from '../../src/index.ts';

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

function freshSDK(): GameSDK {
  return GameSDK.create(BASE_CONFIG);
}

// ── isInitialized() ──────────────────────────────────────────────────────────

describe('sdk.isInitialized()', () => {

  it('returns false immediately after create() — before initialize()', () => {
    const sdk = freshSDK();
    expect(sdk.isInitialized()).toBe(false);
  });

  it('returns true after initialize() is called', () => {
    const sdk = freshSDK();
    sdk.initialize();
    expect(sdk.isInitialized()).toBe(true);
  });

  it('returns a boolean (never undefined or null)', () => {
    const sdk = freshSDK();
    expect(typeof sdk.isInitialized()).toBe('boolean');
    sdk.initialize();
    expect(typeof sdk.isInitialized()).toBe('boolean');
  });

});

// ── initialize() ─────────────────────────────────────────────────────────────

describe('sdk.initialize()', () => {

  beforeEach(() => {
    // Suppress expected "called more than once" warnings in test output.
    // Logger methods are stubs (Phase 3 TODOs) that don't call console.warn yet,
    // so we spy on Logger.prototype.warn directly.
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('does not throw on first call', () => {
    const sdk = freshSDK();
    expect(() => sdk.initialize()).not.toThrow();
  });

  it('does not throw on second call (idempotent guard)', () => {
    const sdk = freshSDK();
    sdk.initialize();
    expect(() => sdk.initialize()).not.toThrow();
  });

  it('does not throw on many repeated calls', () => {
    const sdk = freshSDK();
    expect(() => {
      sdk.initialize();
      sdk.initialize();
      sdk.initialize();
      sdk.initialize();
      sdk.initialize();
    }).not.toThrow();
  });

  it('remains initialized after a second initialize() call', () => {
    const sdk = freshSDK();
    sdk.initialize();
    sdk.initialize(); // second call — must be a no-op
    expect(sdk.isInitialized()).toBe(true);
  });

  it('emits a warning on second call (lifecycle guard is active)', () => {
    const sdk = freshSDK();
    // Logger methods are stubs (Phase 3 TODOs) — spy on Logger.prototype.warn
    // rather than console.warn, which is never called by the stub.
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    sdk.initialize();
    sdk.initialize(); // should trigger warn path

    // The SDK must invoke this._logger.warn() about duplicate initialization
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns void (not a Promise, not a value)', () => {
    const sdk = freshSDK();
    const result = sdk.initialize();
    expect(result).toBeUndefined();
  });

});
