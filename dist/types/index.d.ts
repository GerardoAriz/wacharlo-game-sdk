/**
 * Shared SDK-wide TypeScript types and interfaces.
 *
 * These types are used across all modules. Import from here, never define
 * duplicates inside individual modules.
 */
/**
 * Organized SDKEvent constant map.
 *
 * The SDK is completely game-agnostic and acts exclusively as a generic communication bridge.
 * Room ownership belongs to the game implementation. The SDK does not own, generate, or manage Room IDs.
 */
export declare const SDKEvent: {
    readonly INITIALIZE: "INITIALIZE";
    readonly GAME_STARTED: "GAME_STARTED";
    readonly GAME_PAUSED: "GAME_PAUSED";
    readonly GAME_RESUMED: "GAME_RESUMED";
    readonly GAME_OVER: "GAME_OVER";
    readonly DATA_UPDATED: "DATA_UPDATED";
    readonly ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED";
    readonly SHOW_LEADERBOARD: "SHOW_LEADERBOARD";
    readonly REQUEST_LEADERBOARD: "REQUEST_LEADERBOARD";
    readonly REQUEST_EXIT: "REQUEST_EXIT";
    readonly REQUEST_PAUSE: "REQUEST_PAUSE";
    readonly REQUEST_RESUME: "REQUEST_RESUME";
    readonly START_GAME: "START_GAME";
    readonly RESTART_GAME: "RESTART_GAME";
    readonly LOAD_MINIGAME: "LOAD_MINIGAME";
    readonly ADOPT_SESSION: "ADOPT_SESSION";
    /** Emitted when a multiplayer room is created. Payload contains roomId & host player info. */
    readonly ROOM_CREATED: "ROOM_CREATED";
    /** Emitted when a player joins an existing room. */
    readonly ROOM_JOINED: "ROOM_JOINED";
    /** Emitted when another player enters the room. */
    readonly PLAYER_JOINED: "PLAYER_JOINED";
    /** Emitted when a player leaves the room. */
    readonly PLAYER_LEFT: "PLAYER_LEFT";
    /** Emitted when all required players are present and room is ready for start. */
    readonly MATCH_READY: "MATCH_READY";
    /** Emitted when the multiplayer match officially starts. */
    readonly MATCH_STARTED: "MATCH_STARTED";
    /** Emitted when a player dies or is eliminated from a match. */
    readonly PLAYER_DIED: "PLAYER_DIED";
    /** Emitted when the multiplayer match finishes. */
    readonly MATCH_FINISHED: "MATCH_FINISHED";
    /** Emitted when the room is destroyed / closed. */
    readonly ROOM_DESTROYED: "ROOM_DESTROYED";
    readonly INVITE_FRIEND: "INVITE_FRIEND";
    readonly SHARE_ROOM: "SHARE_ROOM";
    /** @deprecated Kept for backwards compatibility. Room joining pipeline is managed by game/host. */
    readonly JOIN_PIPELINE_STARTED: "JOIN_PIPELINE_STARTED";
    /** @deprecated Kept for backwards compatibility. Room joining pipeline is managed by game/host. */
    readonly JOIN_PIPELINE_FINISHED: "JOIN_PIPELINE_FINISHED";
    /** @deprecated Kept for backwards compatibility. Handshakes are managed by game/host. */
    readonly HANDSHAKE_INIT: "HANDSHAKE_INIT";
    /** @deprecated Kept for backwards compatibility. Handshakes are managed by game/host. */
    readonly HANDSHAKE_ACK: "HANDSHAKE_ACK";
    /** @deprecated Replaced by ROOM_DESTROYED. */
    readonly DESTROYING_ROOM: "DESTROYING_ROOM";
    /** @deprecated Replaced by ROOM_DESTROYED. */
    readonly ROOM_CLOSED: "ROOM_CLOSED";
    /** @deprecated Command event. Prefer host.emit(SDKEvent.ROOM_JOINED). */
    readonly JOIN_ROOM: "JOIN_ROOM";
    /** @deprecated Replaced by PLAYER_LEFT or ROOM_DESTROYED. */
    readonly ROOM_LEFT: "ROOM_LEFT";
    /** @deprecated Replaced by MATCH_READY. */
    readonly MATCH_PREPARING: "MATCH_PREPARING";
    /** @deprecated Replaced by MATCH_STARTED. */
    readonly COUNTDOWN_STARTED: "COUNTDOWN_STARTED";
    /** @deprecated Managed at game implementation level. */
    readonly REMATCH_REQUESTED: "REMATCH_REQUESTED";
    /** @deprecated Managed at game implementation level. */
    readonly REMATCH_ACCEPTED: "REMATCH_ACCEPTED";
    /** @deprecated Managed at game implementation level. */
    readonly PLAYER_READY: "PLAYER_READY";
    /** @deprecated Managed at game implementation level. */
    readonly PLAYER_RECONNECTING: "PLAYER_RECONNECTING";
    /** @deprecated Managed at game implementation level. */
    readonly PLAYER_RECONNECTED: "PLAYER_RECONNECTED";
    /** @deprecated Managed at game implementation level. */
    readonly SCORE_UPDATED: "SCORE_UPDATED";
};
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
/**
 * @deprecated Legacy session storage adapter. Room and session persistence belong to game/host.
 */
export interface ISessionStorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
/**
 * @deprecated Legacy invite payload schema. Invitations and room creation are managed by WacharloApp/Game.
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
 * @deprecated Legacy trigger type. Entry triggers are forwarded by WacharloApp directly to the game.
 */
export type JoinTriggerType = 'deep_link' | 'push_notification' | 'friend_invite' | 'room_code' | 'qr_code' | 'session_recovery' | 'matchmaking';
/**
 * @deprecated Legacy raw trigger event.
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
 * @deprecated Legacy join request. Room joining is owned by the game implementation.
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
 * @deprecated Room lifecycle state. Room state management belongs to the game implementation.
 */
export type RoomState = 'IDLE' | 'CREATING' | 'WAITING_FOR_PLAYERS' | 'PREPARING_MATCH' | 'IN_GAME' | 'PAUSED' | 'DESTROYING' | 'CLOSED';
/**
 * @deprecated Handshake initialization payload.
 */
export interface HandshakeInitPayload {
    sdkVersion: string;
    gameId: string;
    gameVersion: string;
    protocolVersion: number;
}
/**
 * @deprecated Handshake ACK payload.
 */
export interface HandshakeAckPayload {
    status: 'ACCEPTED' | 'REJECTED';
    minRequiredSdkVersion?: string;
    errorCode?: string;
    reason?: string;
}
export interface PlayerState {
    playerId: string;
    isAlive: boolean;
    score: number;
    deathOrder?: number;
    diedAt?: number;
    teamId?: string;
    customStats?: Record<string, unknown>;
}
export interface MatchStateSnapshot {
    roomId: string;
    players: ReadonlyArray<Readonly<PlayerState>>;
    aliveCount: number;
    eliminatedCount: number;
    eliminationOrder: ReadonlyArray<string>;
    finalScores: Readonly<Record<string, number>>;
    startTime: number;
    durationMs: number;
}
export interface PlayerPlacement {
    playerId: string;
    rank: number;
    score: number;
    isSurvivor: boolean;
    eliminatedAt?: number;
    teamId?: string;
}
export interface MatchEvaluationResult {
    winners: string[];
    placements: PlayerPlacement[];
    ruleName: string;
    reason: string;
    metadata?: Record<string, unknown>;
}
export interface PlayerDiedPayload {
    playerId: string;
    roomId?: string;
    score?: number;
    reason?: string;
    timestamp?: number;
}
export interface MatchFinishedPayload {
    roomId: string;
    winners: string[];
    placements: PlayerPlacement[];
    finalScores: Record<string, number>;
    eliminationOrder: string[];
    matchDurationMs: number;
    ruleName: string;
    reason: string;
    completedAt: number;
}
export interface IMatchRuleEvaluator {
    readonly name: string;
    isMatchComplete(snapshot: Readonly<MatchStateSnapshot>): boolean;
    evaluateResult(snapshot: Readonly<MatchStateSnapshot>): MatchEvaluationResult;
}
export interface IMatchDataAggregator {
    getRoomId(): string;
    startMatch(playerIds: string[], startTime?: number): void;
    processPlayerDied(playerId: string, score?: number, timestamp?: number): boolean;
    updatePlayerScore(playerId: string, score: number): void;
    getSnapshot(): Readonly<MatchStateSnapshot>;
    isPlayerAlive(playerId: string): boolean;
    getPlayerState(playerId: string): Readonly<PlayerState> | undefined;
}
//# sourceMappingURL=index.d.ts.map