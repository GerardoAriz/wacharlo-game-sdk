/**
 * Shared SDK-wide TypeScript types and interfaces.
 *
 * These types are used across all modules. Import from here, never define
 * duplicates inside individual modules.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Event System Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All event types the SDK can emit to or receive from the host platform.
 *
 * Outgoing (game → host):
 *   INITIALIZE, GAME_STARTED, GAME_PAUSED, GAME_RESUMED,
 *   DATA_UPDATED, GAME_OVER, ACHIEVEMENT_UNLOCKED,
 *   REQUEST_LEADERBOARD, REQUEST_EXIT, REQUEST_PAUSE, REQUEST_RESUME
 *
 * Incoming (host → game):
 *   START_GAME, RESTART_GAME, LOAD_MINIGAME, REQUEST_PAUSE, REQUEST_RESUME
 *
 * TODO: Expand this union as new game features are added.
 */
export type SDKEventType =
  // ── Lifecycle ──────────────────────────────────────────────────────────────
  | 'INITIALIZE'
  | 'GAME_STARTED'
  | 'GAME_PAUSED'
  | 'GAME_RESUMED'
  | 'GAME_OVER'
  // ── Data ──────────────────────────────────────────────────────────────────
  | 'DATA_UPDATED'
  // ── Achievements ──────────────────────────────────────────────────────────
  | 'ACHIEVEMENT_UNLOCKED'
  // ── Host Requests (game → host) ───────────────────────────────────────────
  | 'SHOW_LEADERBOARD'
  | 'REQUEST_LEADERBOARD'
  | 'REQUEST_EXIT'
  | 'REQUEST_PAUSE'
  | 'REQUEST_RESUME'
  // ── Host Commands (host → game) ───────────────────────────────────────────
  | 'START_GAME'
  | 'RESTART_GAME'
  | 'LOAD_MINIGAME'
  | 'ADOPT_SESSION';

/**
 * Generic event payload. Each event type may carry different data.
 *
 * TODO: Replace `any` with a discriminated union of typed payloads
 *       as each event's shape becomes stable.
 */
export type SDKEventPayload = Record<string, unknown>;

/**
 * Message envelope sent over the bridge transport layer.
 *
 * Includes both the new structured schema and legacy fields for backwards
 * compatibility with existing Flutter WebView handlers.
 */
export interface SDKMessageType {
  /** New schema: event name */
  event: SDKEventType;
  /** Legacy field: same as `event`, kept for backwards compat */
  type: SDKEventType;

  gameId: string;
  gameVersion: string;
  sdkVersion: string;
  timestamp: number;
  sessionId: string;
  device: SDKDeviceInfo;

  /** Game data snapshot at the moment of the event */
  data: Partial<SDKGameData>;

  /** Arbitrary extra fields for custom events */
  payload?: SDKEventPayload;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Data Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot of all game data values the SDK can communicate to the host.
 *
 * The game owns and controls these values.
 * The SDK only reads and transmits them — never modifies them.
 *
 * TODO: Add additional fields as games require them:
 *   - xp?: number
 *   - stars?: number
 *   - powerups?: string[]
 *   - customData?: Record<string, unknown>
 */
export interface SDKGameData {
  score: number;
  highScore: number;
  coins: number;
  gems: number;
  lives: number;
  combo: number;
  multiplier: number;
  timer: number;
  level: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Device & Session Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Device fingerprint captured at session start.
 *
 * TODO: Add screen resolution, orientation, and connection type.
 */
export interface SDKDeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  language: string;
  pixelRatio: number;
}

/**
 * Metadata attached to a game session.
 */
export interface SDKSessionMeta {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  device: SDKDeviceInfo;
}

/**
 * Diagnostics information exposed by the SDK.
 */
export interface SDKDiagnostics {
  activeTransport: string;
  hostDetected: boolean;
  deliveryMethod: string;
  sdkVersion: string;
  messagesSent: number;
  messagesReceived: number;
  pendingMessages: number;
  lastMessage: SDKMessageType | null;
  lastError: string | null;
  lastTransportFailure: string | null;
  transportInitializationTime: number | null;
  /** The active session ID, or null if no session has started. */
  sessionId: string | null;
  /**
   * Indicates how the current session ID was established.
   *   'host'  — adopted from a host-provided value (embedded Wacharlo mode).
   *   'local' — generated locally by the SDK (standalone / development mode).
   *   'none'  — no session has been started yet.
   */
  sessionSource: 'host' | 'local' | 'none';
  /**
   * Describes the specific mechanism by which the session ID was delivered or created.
   *   'window-global'     — pre-injected by host in window.__WACHA__.sessionId or window.__WACHA_SESSION_ID__
   *   'transport-message' — delivered via host postMessage / channel ADOPT_SESSION event
   *   'manual'            — explicitly passed to sdk.adoptSessionId()
   *   'generated'         — auto-generated locally by SDK (crypto.randomUUID)
   *   'none'              — no active session
   */
  sessionOrigin: 'window-global' | 'transport-message' | 'manual' | 'generated' | 'none';
  /** The name of the active transport class. Same as activeTransport for convenience. */
  transport: string;
}


