import type { IGameSDK, GameResult } from './IGameSDK';
import type { GameConfig } from '../config/GameConfig';
import type { SDKGameData, SDKEventType, SDKDiagnostics } from '../types/index';
import type { EventCallback } from '../events/IEventManager';
import type { IHostManager } from '../host/IHostManager';
import type { ISocialManager } from '../social/ISocialManager';
import { Transport } from '../transport/Transport';
/**
 * GameSDK
 *
 * The composition root and sole public class of the @wacharlo/game-sdk.
 */
export declare class GameSDK implements IGameSDK {
    private readonly _session;
    private readonly _data;
    private readonly _events;
    private readonly _achievements;
    private readonly _hostManager;
    private readonly _socialManager;
    private readonly _logger;
    private readonly _transport;
    private _initialized;
    private _sessionOver;
    private _sessionActive;
    private readonly _config;
    /**
     * Host-provided session ID.
     * Set either at construction time (via `create()` overrides),
     * auto-adopted during `initialize()`,
     * or set at runtime via `adoptSessionId()` before `startSession()` is called.
     * `null` means no host ID has been provided — local generation will be used.
     */
    private _hostSessionId;
    private _hostSessionOrigin;
    private _lastReportTime;
    private _throttleTimeout;
    private _pendingReportData;
    get version(): string;
    get config(): Readonly<GameConfig>;
    get host(): IHostManager;
    get social(): ISocialManager;
    private constructor();
    static create(config: GameConfig, overrides?: {
        transport?: Transport;
        sessionId?: string;
    }): GameSDK;
    isInitialized(): boolean;
    initialize(): void;
    adoptSessionId(sessionId: string, origin?: 'manual' | 'transport-message' | 'window-global'): void;
    startSession(): void;
    pause(): void;
    resume(): void;
    gameOver(result?: GameResult): void;
    report(data: Partial<SDKGameData>): void;
    private sendReportImmediately;
    private flushPendingReport;
    unlockAchievement(id: string): void;
    showLeaderboard(payload?: Record<string, unknown>): void;
    on<T = unknown>(event: SDKEventType, callback: EventCallback<T>): () => void;
    off<T = unknown>(event: SDKEventType, callback: EventCallback<T>): void;
    dispose(): void;
    getDiagnostics(): SDKDiagnostics;
    private sendHostEnvelope;
    private createMessageEnvelope;
}
//# sourceMappingURL=GameSDK.d.ts.map