import type { IGameSDK, GameResult } from './IGameSDK';
import type { GameConfig } from '../config/GameConfig';
import type { SDKGameData, SDKEventType, SDKDiagnostics, SDKMessageType, SDKEventEnvelope } from '../types/index';
import type { EventCallback } from '../events/IEventManager';

import { SessionManager } from '../session/SessionManager';
import { GameDataManager } from '../state/GameDataManager';
import { EventManager } from '../events/EventManager';
import { AchievementManager } from '../achievements/AchievementManager';
import { HostManager } from '../host/HostManager';
import { SocialManager } from '../social/SocialManager';
import type { IHostManager } from '../host/IHostManager';
import type { ISocialManager } from '../social/ISocialManager';
import { Logger } from '../logger/Logger';
import { SDK_VERSION } from '../version/index';
import { Transport } from '../transport/Transport';
import { detectTransport } from '../transport/detect';

/**
 * GameSDK
 *
 * The composition root and sole public class of the @wacharlo/game-sdk.
 */
export class GameSDK implements IGameSDK {

  // ── Private Internal Modules ───────────────────────────────────────────────

  private readonly _session: SessionManager;
  private readonly _data: GameDataManager;
  private readonly _events: EventManager;
  private readonly _achievements: AchievementManager;
  private readonly _hostManager: HostManager;
  private readonly _socialManager: SocialManager;
  private readonly _logger: Logger;
  private readonly _transport: Transport;

  private _initialized = false;
  private _sessionOver = false;
  private _sessionActive = false;
  private readonly _config: Readonly<GameConfig>;

  /**
   * Host-provided session ID.
   * Set either at construction time (via `create()` overrides),
   * auto-adopted during `initialize()`,
   * or set at runtime via `adoptSessionId()` before `startSession()` is called.
   * `null` means no host ID has been provided — local generation will be used.
   */
  private _hostSessionId: string | null = null;
  private _hostSessionOrigin: 'window-global' | 'transport-message' | 'manual' | 'generated' | 'none' = 'none';

  // Throttling for report state updates (max 10 calls per second)
  private _lastReportTime = 0;
  private _throttleTimeout: any = null;
  private _pendingReportData: Partial<SDKGameData> | null = null;

  // ── Public Getters ─────────────────────────────────────────────────────────

  public get version(): string {
    return SDK_VERSION;
  }

  public get config(): Readonly<GameConfig> {
    return this._config;
  }

  public get host(): IHostManager {
    return this._hostManager;
  }

  public get social(): ISocialManager {
    return this._socialManager;
  }

  // ── Constructor (Private — use GameSDK.create()) ───────────────────────────

  private constructor(config: GameConfig, overrides?: { transport?: Transport; sessionId?: string }) {
    this._config  = Object.freeze({ ...config });
    this._logger  = new Logger(config.displayName ?? config.gameSlug);
    this._session = new SessionManager();
    this._data    = new GameDataManager();
    this._events  = new EventManager();
    this._achievements = new AchievementManager(this._events);
    this._transport = overrides?.transport ?? detectTransport();

    this._hostManager = new HostManager(
      this._events,
      (envelope: SDKEventEnvelope) => this.sendHostEnvelope(envelope),
      () => this._session.getId() ?? undefined,
    );
    this._socialManager = new SocialManager(this._hostManager);

    if (overrides?.sessionId && overrides.sessionId.trim() !== '') {
      this._hostSessionId = overrides.sessionId.trim();
      this._hostSessionOrigin = 'manual';
      this._logger.info(`Host session ID received at construction: ${this._hostSessionId}`);
    }
  }

  // ── Static Factory ─────────────────────────────────────────────────────────

  public static create(config: GameConfig, overrides?: { transport?: Transport; sessionId?: string }): GameSDK {
    if (!config.gameSlug || typeof config.gameSlug !== 'string' || config.gameSlug.trim() === '') {
      throw new TypeError('GameSDK.create: config.gameSlug is required and must be a non-empty string');
    }
    if (!config.gameVersion || typeof config.gameVersion !== 'string' || config.gameVersion.trim() === '') {
      throw new TypeError('GameSDK.create: config.gameVersion is required and must be a non-empty string');
    }
    return new GameSDK(config, overrides);
  }

  // ── IGameSDK Implementation ────────────────────────────────────────────────

  public isInitialized(): boolean {
    return this._initialized;
  }

  public initialize(): void {
    if (this._initialized) {
      this._logger.warn('initialize() called more than once — ignoring. The SDK may only be initialized once per instance.');
      return;
    }

    this._logger.info(
      `@wacharlo/game-sdk v${SDK_VERSION} | "${this._config.gameSlug}" v${this._config.gameVersion} | ${this._transport.constructor.name}`
    );

    // Initialize the selected transport strategy
    this._transport.initialize();

    // Auto-adopt session ID pre-injected into window global namespace if available
    if (typeof window !== 'undefined') {
      const globalWacha = (window as any).__WACHA__;
      const preloadedId = (globalWacha && typeof globalWacha.sessionId === 'string' && globalWacha.sessionId.trim() !== '')
        ? globalWacha.sessionId.trim()
        : ((window as any).__WACHA_SESSION_ID__ && typeof (window as any).__WACHA_SESSION_ID__ === 'string')
          ? (window as any).__WACHA_SESSION_ID__.trim()
          : null;

      if (preloadedId) {
        this._hostSessionId = preloadedId;
        this._hostSessionOrigin = 'window-global';
        this._logger.info(`Host session ID auto-adopted from window global: ${this._hostSessionId}`);
      }
    }

    // Route host incoming commands into our internal event manager
    this._transport.setMessageHandler((msg: SDKMessageType) => {
      const eventName = msg.event || msg.type;

      // Intercept ADOPT_SESSION events directly inside the SDK transport layer
      if (eventName === 'ADOPT_SESSION') {
        const id = (msg.payload as any)?.sessionId;
        if (id && typeof id === 'string' && id.trim() !== '') {
          if (this._sessionActive) {
            this._logger.error(
              `ADOPT_SESSION message received AFTER startSession() — running session cannot be modified. Provided ID "${id}" ignored.`
            );
          } else {
            this._hostSessionId = id.trim();
            this._hostSessionOrigin = 'transport-message';
            this._logger.info(`Host session ID adopted via transport message: ${this._hostSessionId}`);
          }
        }
        return; // Intercepted — do not dispatch to public event bus
      }

      if (eventName) {
        this._events.emit(eventName, msg.payload);
      }
    });

    // Send the INITIALIZE message (session is not yet started, pass empty metadata placeholders)
    const initMsg = this.createMessageEnvelope('INITIALIZE');
    this._transport.send(initMsg);

    this._initialized = true;
  }

  public adoptSessionId(sessionId: string, origin: 'manual' | 'transport-message' | 'window-global' = 'manual'): void {
    if (!this._initialized) {
      this._logger.warn(
        'adoptSessionId() called before initialize(). Call sdk.initialize() first. The session ID was NOT adopted.'
      );
      return;
    }
    if (this._sessionActive) {
      this._logger.error(
        `adoptSessionId() called AFTER startSession() — the running session ID cannot be changed retroactively. ` +
        `Provided ID "${sessionId}" was ignored. ` +
        `To use a host session ID, call adoptSessionId() before startSession().`
      );
      return;
    }
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      this._logger.warn('adoptSessionId() received an empty or invalid session ID — ignoring.');
      return;
    }

    this._hostSessionId = sessionId.trim();
    this._hostSessionOrigin = origin;
    this._logger.info(`Host session ID adopted (${origin}): ${this._hostSessionId}`);
  }

  public startSession(): void {
    if (!this._initialized) {
      this._logger.warn('startSession() called before initialize(). Call sdk.initialize() first.');
      return;
    }

    if (this._sessionActive) {
      this._logger.warn('startSession() called while a session is already active. Closing the previous session automatically.');
      this._session.end();
    }

    this._session.start(
      this._hostSessionId ?? undefined,
      (this._hostSessionId && this._hostSessionOrigin !== 'none') ? this._hostSessionOrigin : 'generated',
    );
    this._data.reset();
    this._achievements.reset();

    this._sessionOver = false;
    this._sessionActive = true;

    // Reset throttle states for the new session
    this._pendingReportData = null;
    if (this._throttleTimeout) {
      clearTimeout(this._throttleTimeout);
      this._throttleTimeout = null;
    }

    // Send the GAME_STARTED message
    const msg = this.createMessageEnvelope('GAME_STARTED');
    this._transport.send(msg);
  }

  public pause(): void {
    if (!this._sessionActive) {
      this._logger.warn('pause() called with no active session. Call startSession() first.');
      return;
    }
    const msg = this.createMessageEnvelope('GAME_PAUSED');
    this._transport.send(msg);
  }

  public resume(): void {
    if (!this._sessionActive) {
      this._logger.warn('resume() called with no active session. Call startSession() first.');
      return;
    }
    const msg = this.createMessageEnvelope('GAME_RESUMED');
    this._transport.send(msg);
  }

  public gameOver(result?: GameResult): void {
    if (!this._sessionActive) {
      this._logger.warn('gameOver() called with no active session.');
      return;
    }
    if (this._sessionOver) {
      this._logger.warn('gameOver() called more than once in the same session — ignoring. A session can only end once.');
      return;
    }

    // Flush any pending report data first to ensure latest score/data is merged correctly
    this.flushPendingReport();

    this._sessionOver   = true;
    this._sessionActive = false;

    // Merge any final score and game data snapshot
    if (result?.data) {
      this._data.report(result.data);
    }
    if (result?.score !== undefined) {
      this._data.report({ score: result.score });
    }

    this._session.end();

    const payload: Record<string, unknown> = {};
    if (result?.reason) {
      payload.reason = result.reason;
    }

    const msg = this.createMessageEnvelope('GAME_OVER', payload);
    this._transport.send(msg);
  }

  public report(data: Partial<SDKGameData>): void {
    if (!this._sessionActive) {
      this._logger.warn('report() called with no active session. Call startSession() first.');
      return;
    }

    // Cache the snapshot locally immediately
    this._data.report(data);

    // Merge state fields for the next throttled transmit envelope
    this._pendingReportData = {
      ...this._pendingReportData,
      ...data,
    };

    const now = Date.now();
    const elapsed = now - this._lastReportTime;

    if (elapsed >= 100) { // 10 calls per second throttle
      this.sendReportImmediately();
    } else {
      if (!this._throttleTimeout) {
        this._throttleTimeout = setTimeout(() => {
          this.sendReportImmediately();
        }, 100 - elapsed);
      }
    }
  }

  private sendReportImmediately(): void {
    if (this._throttleTimeout) {
      clearTimeout(this._throttleTimeout);
      this._throttleTimeout = null;
    }

    if (!this._sessionActive) {
      this._pendingReportData = null;
      return;
    }

    const msg = this.createMessageEnvelope('DATA_UPDATED');
    this._transport.send(msg);

    this._pendingReportData = null;
    this._lastReportTime = Date.now();
  }

  private flushPendingReport(): void {
    if (this._pendingReportData) {
      this.sendReportImmediately();
    }
  }

  public unlockAchievement(id: string): void {
    if (!this._config.supportsAchievements) {
      this._logger.warn(`unlockAchievement("${id}") called but config.supportsAchievements is false — ignoring.`);
      return;
    }
    if (!this._sessionActive) {
      this._logger.warn('unlockAchievement() called with no active session.');
      return;
    }

    const countBefore = this._achievements.getSessionUnlocks().length;
    this._achievements.unlock(id);
    const countAfter = this._achievements.getSessionUnlocks().length;

    // Only broadcast the event if it's not a duplicate unlock
    if (countAfter > countBefore) {
      const msg = this.createMessageEnvelope('ACHIEVEMENT_UNLOCKED', { achievementId: id });
      this._transport.send(msg);
    }
  }

  public showLeaderboard(payload?: Record<string, unknown>): void {
    if (!this._initialized) {
      this._logger.warn('showLeaderboard() called before initialize(). Call sdk.initialize() first.');
      return;
    }

    const msg = this.createMessageEnvelope('SHOW_LEADERBOARD', payload ?? {});
    this._transport.send(msg);
  }

  public on<T = unknown>(event: SDKEventType, callback: EventCallback<T>): () => void {
    return this._events.on(event, callback);
  }

  public off<T = unknown>(event: SDKEventType, callback: EventCallback<T>): void {
    this._events.off(event, callback);
  }

  public dispose(): void {
    if (this._sessionActive) {
      this._session.end();
    }

    if (this._throttleTimeout) {
      clearTimeout(this._throttleTimeout);
      this._throttleTimeout = null;
    }
    this._pendingReportData = null;

    this._events.clear();
    this._achievements.reset();
    this._data.reset();
    this._transport.destroy();

    this._initialized = false;
    this._sessionActive = false;
    this._sessionOver = false;

    this._logger.info('GameSDK instance disposed.');
  }

  public getDiagnostics(): SDKDiagnostics {
    const base = this._transport.getDiagnostics(this.version);
    return {
      ...base,
      sessionId: this._session.getId(),
      sessionSource: this._session.getSessionSource(),
      sessionOrigin: this._session.getSessionOrigin(),
      transport: base.activeTransport,
    };
  }

  // ── Private Envelope Builder ───────────────────────────────────────────────

  private sendHostEnvelope(envelope: SDKEventEnvelope): void {
    const msg = this.createMessageEnvelope(
      envelope.event,
      envelope.payload as Record<string, unknown> | undefined,
      envelope.roomId,
    );
    this._transport.send(msg);
  }

  private createMessageEnvelope(
    event: SDKEventType,
    payload?: Record<string, unknown>,
    roomId?: string,
  ): SDKMessageType {
    const meta = this._session.getMeta();
    const sessionId = meta?.sessionId ?? '';
    const device = meta?.device ?? {
      type: 'desktop',
      os: 'Unknown',
      language: 'en',
      pixelRatio: 1,
    };

    return {
      event,
      type: event,
      gameId: this._config.gameSlug,
      gameVersion: this._config.gameVersion,
      sdkVersion: this.version,
      timestamp: Date.now(),
      sessionId,
      device,
      data: this._data.getLastSnapshot() ?? {},
      ...(roomId ? { roomId } : {}),
      payload,
    };
  }
}
