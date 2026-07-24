/**
 * @wacharlo/game-sdk — Public API  (v0.1.1-alpha)
 *
 * Import everything from here. Never import directly from sub-modules.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GAME DEVELOPER SURFACE (what you need 99% of the time)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   import { GameSDK }           from '@wacharlo/game-sdk';  ← Main class
 *   import type { GameConfig }   from '@wacharlo/game-sdk';  ← Config type
 *   import type { SDKGameData }  from '@wacharlo/game-sdk';  ← Data snapshot for report()
 *   import type { SDKEventType } from '@wacharlo/game-sdk';  ← Event names for on()/off()
 *   import type { GameResult }   from '@wacharlo/game-sdk';  ← gameOver() payload
 *   import { SDK_VERSION }       from '@wacharlo/game-sdk';  ← Version constant
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FULL PUBLIC API (10 methods + static factory + 2 getters)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   GameSDK.create(config)          ← Static factory — the only way to create
 *
 *   sdk.initialize()                ← Connect to host. Call once.
 *   sdk.isInitialized()             ← Check SDK readiness before calling methods
 *
 *   sdk.adoptSessionId(id)          ← Adopt host session ID (call after initialize, before startSession)
 *   sdk.startSession()              ← Player presses Play / restarts
 *   sdk.report(data)                ← Game reports current state to host
 *   sdk.pause()                     ← Game loop stopped
 *   sdk.resume()                    ← Game loop restarted
 *   sdk.unlockAchievement(id)       ← Player reached a milestone
 *   sdk.showLeaderboard()           ← Request official host leaderboard UI
 *   sdk.gameOver(result?)           ← Run ended, submit results
 *
 *   sdk.on(event, callback)         ← Subscribe to host commands
 *   sdk.off(event, callback)        ← Unsubscribe (or use cleanup fn from on())
 *
 *   sdk.dispose()                   ← Clean shutdown, idempotent
 *
 *   sdk.version                     ← Getter: SDK version string
 *   sdk.config                      ← Getter: frozen GameConfig
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ADVANCED / EXTENSION SURFACE (custom adapters, testing, middleware)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   import { Logger, LogLevel }      from '@wacharlo/game-sdk';
 *   import type { IBridgeAdapter }   from '@wacharlo/game-sdk';
 *   import { BridgeAdapter }         from '@wacharlo/game-sdk';
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── PRIMARY PUBLIC API ────────────────────────────────────────────────────────

/** The main SDK class. The only class game code should ever instantiate. */
export { GameSDK } from './sdk/GameSDK';

/** The contract every Wacharlo game must fill out to initialize the SDK. */
export type { GameConfig } from './config/GameConfig';

/** The payload passed to sdk.gameOver(). All fields optional. */
export type { GameResult } from './sdk/IGameSDK';

// ── TYPES (commonly needed in game code) ──────────────────────────────────────

/** Game data fields the SDK can communicate. All are optional in sdk.report(). */
export type { SDKGameData } from './types/index';

/** Constant map of all SDK events organized into logical namespaces. */
export { SDKEvent } from './types/index';

/** All event names the SDK emits or receives. */
export type { SDKEventType, SDKEventEnvelope } from './types/index';

/** The callback signature for event listeners. */
export type { EventCallback } from './events/IEventManager';

// ── SUB-MODULE MANAGERS ───────────────────────────────────────────────────────

export type { IHostManager } from './host/IHostManager';
export { HostManager } from './host/HostManager';

export type { ISocialManager } from './social/ISocialManager';
export { SocialManager } from './social/SocialManager';

// ── VERSION ───────────────────────────────────────────────────────────────────

/** The running SDK version string. E.g. "1.1.0-rc1". */
export { SDK_VERSION } from './version/index';

// ── ADVANCED / EXTENSION SURFACE ─────────────────────────────────────────────
// The items below are exported for advanced use cases:
//   - Writing custom BridgeAdapters for non-standard environments
//   - Mocking SDK internals in unit tests
//   - Building SDK plugins or middleware
// Game code should rarely (if ever) need these.

/** Structured logger with configurable log levels. */
export { Logger, LogLevel } from './logger/Logger';

/** Abstract base for custom bridge transport implementations. */
export type { IBridgeAdapter } from './bridge/IBridgeAdapter';
export { BridgeAdapter } from './bridge/BridgeAdapter';

/** Full SDK interface — useful for typing sdk instances in tests. */
export type { IGameSDK } from './sdk/IGameSDK';

// ── INTERNAL TYPES (exposed for completeness, not typically needed in game code)

export type {
  SDKEventPayload,
  SDKMessageType,
  SDKDeviceInfo,
  SDKSessionMeta,
  SDKDiagnostics,
  ISessionStorageAdapter,
  InvitePayload,
  JoinTriggerType,
  RawAppTriggerEvent,
  JoinRequest,
  RoomState,
  HandshakeInitPayload,
  HandshakeAckPayload,
} from './types/index';

// ── LEGACY & DEPRECATED SERVICES (Kept for runtime backwards compatibility) ──
// Room ownership belongs to the game implementation.
// The SDK does not own, generate, or manage Room IDs or invitation pipelines.

export { MemoryStorageAdapter, LocalStorageAdapter } from './session/StorageAdapter.js';
export { InvitationService, InMemoryLookupService } from './social/InvitationService.js';
export type { ILookupService } from './social/InvitationService.js';
export { JoinPipelineManager } from './session/JoinPipelineManager.js';
export type { JoinPipelineResult } from './session/JoinPipelineManager.js';
export { SessionRecoveryManager } from './session/SessionRecoveryManager.js';
export type { RecoverySessionData } from './session/SessionRecoveryManager.js';

