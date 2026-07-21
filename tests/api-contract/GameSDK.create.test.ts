/**
 * API Contract Tests — GameSDK.create()
 *
 * Verifies: the static factory returns a valid, well-formed SDK instance.
 * Does NOT test: Flutter, bridge communication, DOM, or business logic.
 */

import { describe, it, expect } from 'vitest';
import { GameSDK, SDK_VERSION } from '../../src/index.ts';
import type { GameConfig } from '../../src/index.ts';

// ── Shared test fixture ──────────────────────────────────────────────────────

const BASE_CONFIG: GameConfig = {
  gameSlug:            'test-game',
  gameVersion:         '1.0.0',
  minSDKVersion:       '0.1.0',
  supportsLeaderboard: false,
  supportsAchievements: false,
  supportsCloudSave:   false,
  supportsXP:          false,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GameSDK.create(config)', () => {

  it('returns a non-null object', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(sdk).not.toBeNull();
    expect(sdk).not.toBeUndefined();
  });

  it('returns an instance of GameSDK', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(sdk).toBeInstanceOf(GameSDK);
  });

  it('exposes sdk.version as a non-empty string', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(typeof sdk.version).toBe('string');
    expect(sdk.version.length).toBeGreaterThan(0);
  });

  it('sdk.version matches the exported SDK_VERSION constant', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(sdk.version).toBe(SDK_VERSION);
  });

  it('exposes sdk.config as a frozen object matching the input', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    expect(sdk.config).toBeDefined();
    expect(sdk.config.gameSlug).toBe(BASE_CONFIG.gameSlug);
    expect(sdk.config.gameVersion).toBe(BASE_CONFIG.gameVersion);
    expect(sdk.config.minSDKVersion).toBe(BASE_CONFIG.minSDKVersion);
    expect(sdk.config.supportsLeaderboard).toBe(BASE_CONFIG.supportsLeaderboard);
    expect(sdk.config.supportsAchievements).toBe(BASE_CONFIG.supportsAchievements);
    expect(sdk.config.supportsCloudSave).toBe(BASE_CONFIG.supportsCloudSave);
    expect(sdk.config.supportsXP).toBe(BASE_CONFIG.supportsXP);
  });

  it('sdk.config is frozen (mutations are silently ignored)', () => {
    const sdk = GameSDK.create(BASE_CONFIG);
    const originalSlug = sdk.config.gameSlug;

    // Strict-mode mutation on a frozen object throws in strict mode,
    // but we rely on Object.freeze() to silently drop it — wrap to be safe.
    expect(() => {
      try { (sdk.config as Record<string, unknown>).gameSlug = 'mutated'; } catch { /* frozen */ }
    }).not.toThrow();

    expect(sdk.config.gameSlug).toBe(originalSlug);
  });

  it('each call to create() returns an independent instance', () => {
    const sdkA = GameSDK.create({ ...BASE_CONFIG, gameSlug: 'game-a' });
    const sdkB = GameSDK.create({ ...BASE_CONFIG, gameSlug: 'game-b' });

    expect(sdkA).not.toBe(sdkB);
    expect(sdkA.config.gameSlug).toBe('game-a');
    expect(sdkB.config.gameSlug).toBe('game-b');
  });

  it('exposes the required public API methods', () => {
    const sdk = GameSDK.create(BASE_CONFIG);

    expect(typeof sdk.isInitialized).toBe('function');
    expect(typeof sdk.initialize).toBe('function');
    expect(typeof sdk.startSession).toBe('function');
    expect(typeof sdk.report).toBe('function');
    expect(typeof sdk.pause).toBe('function');
    expect(typeof sdk.resume).toBe('function');
    expect(typeof sdk.gameOver).toBe('function');
    expect(typeof sdk.unlockAchievement).toBe('function');
    expect(typeof sdk.on).toBe('function');
    expect(typeof sdk.off).toBe('function');
    expect(typeof sdk.dispose).toBe('function');
  });

});
