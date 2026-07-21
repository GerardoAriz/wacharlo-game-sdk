/**
 * API Contract Tests — sdk.dispose()
 *
 * Verifies:
 *   - Method exists on the SDK instance
 *   - Returns void
 *   - NEVER throws, regardless of SDK state
 *   - Is fully idempotent (safe to call any number of times)
 *   - Safe before initialize()
 *   - Safe after initialize() with no session
 *   - Safe mid-session (with an active session)
 *   - Safe after gameOver()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameSDK } from '../../src/index.ts';
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

// ── dispose() ────────────────────────────────────────────────────────────────

describe('sdk.dispose()', () => {

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('exists as a callable function', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(typeof sdk.dispose).toBe('function');
  });

  it('returns void (not a Promise, not a value)', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    const result = sdk.dispose();
    expect(result).toBeUndefined();
  });

  // ── Safety across all lifecycle states ──────────────────────────────────────

  it('does not throw when called before initialize()', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(() => sdk.dispose()).not.toThrow();
  });

  it('does not throw when called after initialize() with no session', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();
    expect(() => sdk.dispose()).not.toThrow();
  });

  it('does not throw when called with an active session (mid-session)', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();
    sdk.startSession();
    expect(() => sdk.dispose()).not.toThrow();
  });

  it('does not throw when called after gameOver()', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();
    sdk.startSession();
    sdk.gameOver({ score: 100 });
    expect(() => sdk.dispose()).not.toThrow();
  });

  // ── Idempotency ─────────────────────────────────────────────────────────────

  it('is idempotent — two calls never throw', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();
    sdk.dispose();
    expect(() => sdk.dispose()).not.toThrow();
  });

  it('is idempotent — five calls never throw', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    sdk.initialize();
    expect(() => {
      sdk.dispose();
      sdk.dispose();
      sdk.dispose();
      sdk.dispose();
      sdk.dispose();
    }).not.toThrow();
  });

  it('is idempotent even without ever calling initialize()', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(() => {
      sdk.dispose();
      sdk.dispose();
      sdk.dispose();
    }).not.toThrow();
  });

});
