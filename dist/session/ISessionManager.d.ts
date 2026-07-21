import type { SDKSessionMeta } from '../types/index';
/**
 * ISessionManager
 *
 * Contract for managing the lifecycle of a single game session within the SDK.
 *
 * Responsibilities:
 *   - Generate OR adopt a unique session ID (UUID v4)
 *   - Track session start time, end time, and duration
 *   - Capture device fingerprint at session start
 *   - Expose session metadata for inclusion in all outgoing bridge messages
 *   - Report whether the session ID was host-provided or locally generated
 *
 * Design note:
 *   One SessionManager instance = one game session.
 *   When a game is restarted, the SDK should create a new session
 *   (new UUID, new start time). This is NOT the same as resuming.
 *
 * Session ID sources:
 *   - 'host'  — ID was provided by the Wacharlo host app (embedded mode).
 *               This is the canonical Supabase session ID.
 *   - 'local' — ID was generated locally via crypto.randomUUID() (standalone).
 *   - 'none'  — No session has been started yet.
 */
export interface ISessionManager {
    /**
     * Starts a new session: adopts or generates a UUID, captures device info, records start time.
     *
     * @param hostSessionId  Optional. When provided by the Wacharlo host, the SDK adopts
     *                       this as the canonical session ID instead of generating a new one.
     *                       Pass `undefined` or omit to trigger local UUID generation.
     * @param origin         Optional. High-resolution origin metadata ('window-global', 'transport-message', 'manual').
     *
     * Must be called before any other session methods.
     * Calling start() on an already-active session should log a warning and no-op.
     */
    start(hostSessionId?: string, origin?: 'window-global' | 'transport-message' | 'manual' | 'generated'): void;
    /**
     * Ends the current session: records end time, calculates duration.
     *
     * After calling end(), the session metadata is frozen and available via getMeta().
     *
     * TODO: Implement in SessionManager.
     */
    end(): void;
    /**
     * Returns the current session ID.
     * Returns `null` if no session has been started.
     *
     * TODO: Implement in SessionManager.
     */
    getId(): string | null;
    /**
     * Returns whether a session is currently active (started but not ended).
     *
     * TODO: Implement in SessionManager.
     */
    isActive(): boolean;
    /**
     * Returns the full session metadata snapshot.
     * Includes sessionId, startedAt, endedAt (if ended), duration, and device info.
     *
     * Returns `null` if no session has been started.
     *
     * TODO: Implement in SessionManager.
     */
    getMeta(): SDKSessionMeta | null;
    /**
     * Returns the elapsed time in seconds since the session started.
     * Returns 0 if no session is active.
     */
    getElapsedSeconds(): number;
    /**
     * Returns how the current session ID was established.
     *   'host'  — adopted from a host-provided value (embedded Wacharlo mode).
     *   'local' — generated locally by the SDK (standalone / development mode).
     *   'none'  — no session has been started yet.
     */
    getSessionSource(): 'host' | 'local' | 'none';
    /**
     * Returns the high-resolution origin mechanism of the session ID.
     */
    getSessionOrigin(): 'window-global' | 'transport-message' | 'manual' | 'generated' | 'none';
}
//# sourceMappingURL=ISessionManager.d.ts.map