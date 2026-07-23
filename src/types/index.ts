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
 * Organized SDKEvent constant map.
 */
export const SDKEvent = {
  // ── Core & Lifecycle ───────────────────────────────────────────────────────
  INITIALIZE: 'INITIALIZE',
  GAME_STARTED: 'GAME_STARTED',
  GAME_PAUSED: 'GAME_PAUSED',
  GAME_RESUMED: 'GAME_RESUMED',
  GAME_OVER: 'GAME_OVER',
  DATA_UPDATED: 'DATA_UPDATED',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  SHOW_LEADERBOARD: 'SHOW_LEADERBOARD',
  REQUEST_LEADERBOARD: 'REQUEST_LEADERBOARD',
  REQUEST_EXIT: 'REQUEST_EXIT',
  REQUEST_PAUSE: 'REQUEST_PAUSE',
  REQUEST_RESUME: 'REQUEST_RESUME',
  START_GAME: 'START_GAME',
  RESTART_GAME: 'RESTART_GAME',
  LOAD_MINIGAME: 'LOAD_MINIGAME',
  ADOPT_SESSION: 'ADOPT_SESSION',

  // ── TELEMETRY & PIPELINE ───────────────────────────────────────────────────
  JOIN_PIPELINE_STARTED: 'JOIN_PIPELINE_STARTED',
  JOIN_PIPELINE_FINISHED: 'JOIN_PIPELINE_FINISHED',

  // ── ROOM_* (Room Lifecycle Events & Commands) ──────────────────────────────
  ROOM_CREATED: 'ROOM_CREATED',
  ROOM_JOINED: 'ROOM_JOINED',
  ROOM_LEFT: 'ROOM_LEFT',
  DESTROYING_ROOM: 'DESTROYING_ROOM',
  ROOM_CLOSED: 'ROOM_CLOSED',
  JOIN_ROOM: 'JOIN_ROOM',

  // ── MATCH_* (Match Lifecycle Events) ────────────────────────────────────────
  MATCH_PREPARING: 'MATCH_PREPARING',
  COUNTDOWN_STARTED: 'COUNTDOWN_STARTED',
  MATCH_STARTED: 'MATCH_STARTED',
  MATCH_FINISHED: 'MATCH_FINISHED',
  REMATCH_REQUESTED: 'REMATCH_REQUESTED',
  REMATCH_ACCEPTED: 'REMATCH_ACCEPTED',

  // ── PLAYER_* (Player Lifecycle & State Events) ──────────────────────────────
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT',
  PLAYER_READY: 'PLAYER_READY',
  PLAYER_RECONNECTING: 'PLAYER_RECONNECTING',
  PLAYER_RECONNECTED: 'PLAYER_RECONNECTED',
  SCORE_UPDATED: 'SCORE_UPDATED',
  PLAYER_DIED: 'PLAYER_DIED',

  // ── HANDSHAKE ─────────────────────────────────────────────────────────────
  HANDSHAKE_INIT: 'HANDSHAKE_INIT',
  HANDSHAKE_ACK: 'HANDSHAKE_ACK',

  // ── SOCIAL_* (User-Facing Platform Actions) ────────────────────────────────
  INVITE_FRIEND: 'INVITE_FRIEND',
  SHARE_ROOM: 'SHARE_ROOM',
} as const;

/**
 * All event types the SDK can emit to or receive from the host platform.
 */
export type SDKEventType = typeof SDKEvent[keyof typeof SDKEvent];

/**
 * Standardized single message envelope for all Host communication.
 */
export interface SDKEventEnvelope<T = unknown> {
  event: SDKEventType;
  timestamp: number;
  sessionId?: string;
  roomId?: string;
  payload?: T;
}

/**
 * Generic event payload. Each event type may carry different data.
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

  /** Room ID if event pertains to a specific room */
  roomId?: string;

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

// ─────────────────────────────────────────────────────────────────────────────
// Storage & Pipeline Architecture Types (v1.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Storage abstraction interface for session recovery token persistence.
 * Platforms provide their own implementation (localStorage/IndexedDB in Web,
 * Secure Storage in Android, Keychain in iOS).
 */
export interface ISessionStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Standardized invite payload with canonical inviteId and schema versioning.
 */
export interface InvitePayload {
  inviteSchemaVersion: '1.0';
  sdkVersion: string;
  inviteId: string;
  gameId: string;
  inviter: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
  customData?: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
  signature: string;
}

/**
 * Entry trigger channels that Wacharlo App forwards raw to the SDK.
 */
export type JoinTriggerType =
  | 'deep_link'
  | 'push_notification'
  | 'friend_invite'
  | 'room_code'
  | 'qr_code'
  | 'session_recovery'
  | 'matchmaking';

/**
 * Raw trigger envelope delivered by Wacharlo App to GameSDK.
 */
export interface RawAppTriggerEvent {
  trigger: JoinTriggerType;
  payload: Record<string, unknown>;
  userAuthToken: string;
  userProfile: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
  timestamp: number;
}

/**
 * Normalized join request constructed and owned exclusively by GameSDK JoinPipelineManager.
 */
export interface JoinRequest {
  requestId: string;
  trigger: JoinTriggerType;
  inviteId: string;
  gameId: string;
  player: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    authToken: string;
  };
  recoveryToken?: string;
  clientInfo: {
    sdkVersion: string;
    gameVersion: string;
    protocolVersion: number;
  };
  timestamp: number;
}

/**
 * Strict room lifecycle states including DESTROYING teardown state.
 */
export type RoomState =
  | 'IDLE'
  | 'CREATING'
  | 'WAITING_FOR_PLAYERS'
  | 'PREPARING_MATCH'
  | 'IN_GAME'
  | 'PAUSED'
  | 'DESTROYING'
  | 'CLOSED';

/**
 * Handshake negotiation payload sent by guest upon room connection.
 */
export interface HandshakeInitPayload {
  sdkVersion: string;
  gameId: string;
  gameVersion: string;
  protocolVersion: number;
}

/**
 * Handshake response payload returned by room host/server.
 */
export interface HandshakeAckPayload {
  status: 'ACCEPTED' | 'REJECTED';
  minRequiredSdkVersion?: string;
  errorCode?: string;
  reason?: string;
}



