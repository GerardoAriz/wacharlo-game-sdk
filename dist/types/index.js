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
 *
 * The SDK is completely game-agnostic and acts exclusively as a generic communication bridge.
 * Room ownership belongs to the game implementation. The SDK does not own, generate, or manage Room IDs.
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
    // ── STANDARDIZED MULTIPLAYER LIFECYCLE (Generic Contract) ───────────────────
    /** Emitted when a multiplayer room is created. Payload contains roomId & host player info. */
    ROOM_CREATED: 'ROOM_CREATED',
    /** Emitted when a player joins an existing room. */
    ROOM_JOINED: 'ROOM_JOINED',
    /** Emitted when another player enters the room. */
    PLAYER_JOINED: 'PLAYER_JOINED',
    /** Emitted when a player leaves the room. */
    PLAYER_LEFT: 'PLAYER_LEFT',
    /** Emitted when all required players are present and room is ready for start. */
    MATCH_READY: 'MATCH_READY',
    /** Emitted when the multiplayer match officially starts. */
    MATCH_STARTED: 'MATCH_STARTED',
    /** Emitted when a player dies or is eliminated from a match. */
    PLAYER_DIED: 'PLAYER_DIED',
    /** Emitted when the multiplayer match finishes. */
    MATCH_FINISHED: 'MATCH_FINISHED',
    /** Emitted when the room is destroyed / closed. */
    ROOM_DESTROYED: 'ROOM_DESTROYED',
    // ── SOCIAL_* (User-Facing Platform Actions) ────────────────────────────────
    INVITE_FRIEND: 'INVITE_FRIEND',
    SHARE_ROOM: 'SHARE_ROOM',
    // ── LEGACY & DEPRECATED EVENTS ─────────────────────────────────────────────
    /** @deprecated Kept for backwards compatibility. Room joining pipeline is managed by game/host. */
    JOIN_PIPELINE_STARTED: 'JOIN_PIPELINE_STARTED',
    /** @deprecated Kept for backwards compatibility. Room joining pipeline is managed by game/host. */
    JOIN_PIPELINE_FINISHED: 'JOIN_PIPELINE_FINISHED',
    /** @deprecated Kept for backwards compatibility. Handshakes are managed by game/host. */
    HANDSHAKE_INIT: 'HANDSHAKE_INIT',
    /** @deprecated Kept for backwards compatibility. Handshakes are managed by game/host. */
    HANDSHAKE_ACK: 'HANDSHAKE_ACK',
    /** @deprecated Replaced by ROOM_DESTROYED. */
    DESTROYING_ROOM: 'DESTROYING_ROOM',
    /** @deprecated Replaced by ROOM_DESTROYED. */
    ROOM_CLOSED: 'ROOM_CLOSED',
    /** @deprecated Command event. Prefer host.emit(SDKEvent.ROOM_JOINED). */
    JOIN_ROOM: 'JOIN_ROOM',
    /** @deprecated Replaced by PLAYER_LEFT or ROOM_DESTROYED. */
    ROOM_LEFT: 'ROOM_LEFT',
    /** @deprecated Replaced by MATCH_READY. */
    MATCH_PREPARING: 'MATCH_PREPARING',
    /** @deprecated Replaced by MATCH_STARTED. */
    COUNTDOWN_STARTED: 'COUNTDOWN_STARTED',
    /** @deprecated Managed at game implementation level. */
    REMATCH_REQUESTED: 'REMATCH_REQUESTED',
    /** @deprecated Managed at game implementation level. */
    REMATCH_ACCEPTED: 'REMATCH_ACCEPTED',
    /** @deprecated Managed at game implementation level. */
    PLAYER_READY: 'PLAYER_READY',
    /** @deprecated Managed at game implementation level. */
    PLAYER_RECONNECTING: 'PLAYER_RECONNECTING',
    /** @deprecated Managed at game implementation level. */
    PLAYER_RECONNECTED: 'PLAYER_RECONNECTED',
    /** @deprecated Managed at game implementation level. */
    SCORE_UPDATED: 'SCORE_UPDATED',
};
//# sourceMappingURL=index.js.map