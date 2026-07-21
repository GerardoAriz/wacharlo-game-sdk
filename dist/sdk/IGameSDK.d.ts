import type { SDKGameData, SDKEventType, SDKDiagnostics } from '../types/index';
import type { EventCallback } from '../events/IEventManager';
/**
 * GameResult
 *
 * The data the game passes to `sdk.gameOver()` to describe what happened
 * at the end of a session.
 *
 * All fields are optional — pass only what your game tracks.
 *
 * The host platform uses this to:
 *   - Submit scores to leaderboards (if supportsLeaderboard: true)
 *   - Award XP to the player (if supportsXP: true)
 *   - Trigger cloud save (if supportsCloudSave: true)
 *   - Display a post-game summary screen
 *
 * The SDK merges `result.data` with the last `report()` snapshot automatically,
 * so you do not need to repeat all fields — only include what changed at game-over.
 *
 * @example
 *   // Simple — most common case:
 *   sdk.gameOver({ score: 4250 });
 *
 *   // With full data snapshot:
 *   sdk.gameOver({
 *     score: 4250,
 *     reason: 'player_death',
 *     data: { score: 4250, coins: 18, combo: 7, level: 3 },
 *   });
 */
export interface GameResult {
    /**
     * Final score for the session.
     * Convenience shorthand — equivalent to `data.score`.
     * If both `score` and `data.score` are provided, `score` takes precedence.
     */
    score?: number;
    /**
     * Full game data snapshot at the moment the game ended.
     * Include any field that the host should persist or display.
     *
     * In Phase 3, this will be merged with the last `report()` snapshot
     * so games don't need to repeat data they already reported.
     */
    data?: Partial<SDKGameData>;
    /**
     * Optional reason the game ended.
     * Useful for analytics and telemetry.
     *
     * Recommended values (use consistently across your game):
     *   'player_death' | 'time_expired' | 'level_complete' | 'voluntary_exit'
     *
     * TODO (Phase 3): Define a standard enum of reason codes.
     */
    reason?: string;
}
/**
 * IGameSDK
 *
 * The complete, frozen public contract of the @wacharlo/game-sdk.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DESIGN PRINCIPLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. ONE OBJECT — Games hold one reference: the sdk instance.
 *    No sub-managers, no internal classes, no leaking details.
 *
 * 2. FLAT API — All public methods live directly on the sdk object.
 *    sdk.startSession(), sdk.report(), sdk.pause() — never sdk.session.start().
 *
 * 3. MINIMAL SURFACE — 10 methods + 1 static factory + 2 getters.
 *    Every method has exactly one lifecycle moment when it must be called.
 *
 * 4. GAME OWNS DATA — The SDK never modifies game values.
 *    sdk.report() receives a snapshot and communicates it; nothing more.
 *
 * 5. EVENTS ARE THE BRIDGE — Games listen to host commands via sdk.on().
 *    The SDK sends events to the host internally. Games never call send().
 *
 * 6. SAFE BY DEFAULT — Every method guards against incorrect call order.
 *    Calling methods out of sequence produces warnings, never exceptions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LIFECYCLE CONTRACT (enforced in Phase 3)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  initialize()
 *    - MAY only succeed once. Subsequent calls are warnings + no-ops.
 *    - MUST be called before any other method.
 *
 *  startSession()
 *    - ALWAYS creates a brand-new session (new UUID, reset data).
 *    - If called while a session is already active, the previous session
 *      is automatically closed with a warning before the new one begins.
 *    - Requires initialize() to have been called first.
 *
 *  report(data)
 *    - Requires an active session. No-op with warning if called before startSession().
 *    - Never called every frame — only on meaningful data changes.
 *
 *  pause() / resume()
 *    - Require an active session. No-ops with warnings if no session is active.
 *    - Do NOT pause or resume the game engine — that is the game's responsibility.
 *
 *  unlockAchievement(id)
 *    - Requires an active session.
 *    - No-op if config.supportsAchievements is false (with warning).
 *    - Duplicate unlocks within one session are silently ignored.
 *
 *  gameOver(result?)
 *    - Requires an active session.
 *    - MAY only be called once per session. Subsequent calls are warnings + no-ops.
 *    - After gameOver(), call startSession() to begin a new run.
 *
 *  dispose()
 *    - MUST be idempotent. Calling multiple times must NEVER throw.
 *    - If called while a session is active, the session is silently closed first.
 *    - Safe to call even if initialize() was never called.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FULL PUBLIC API AT A GLANCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   GameSDK.create(config)          ← Static factory — the only way to create
 *
 *   sdk.initialize()                ← Connect to host. Call once.
 *   sdk.isInitialized()             ← Check SDK readiness before calling methods
 *
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
 *   sdk.version                     ← Running SDK version string (getter)
 *   sdk.config                      ← Frozen config object (getter)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface IGameSDK {
    /**
     * The running version of @wacharlo/game-sdk.
     *
     * Use this to verify the SDK version at runtime or for diagnostic logging.
     *
     * @example
     *   console.log(sdk.version); // "0.1.1-alpha"
     */
    readonly version: string;
    /**
     * The frozen config object this SDK instance was created with.
     *
     * Immutable after creation. Any mutation attempt will be silently ignored
     * because the config is deeply frozen via `Object.freeze()`.
     *
     * @example
     *   console.log(sdk.config.gameSlug);            // "rope-rush"
     *   console.log(sdk.config.supportsLeaderboard); // true
     */
    readonly config: Readonly<import('../config/GameConfig').GameConfig>;
    /**
     * Returns whether the SDK has been successfully initialized.
     *
     * Use this to safely check SDK readiness before calling other methods,
     * especially when integrating the SDK with existing game code that may
     * call SDK methods before the bootstrap sequence completes.
     *
     * This is the ONLY SDK method that is safe to call before `initialize()`.
     *
     * @returns `true` if `initialize()` has completed successfully; `false` otherwise.
     *
     * @example
     *   // Safe guard in async game code:
     *   if (!sdk.isInitialized()) {
     *     console.warn('SDK not ready — skipping report.');
     *     return;
     *   }
     *   sdk.report({ score: this.score });
     *
     *   // In a loading screen:
     *   await waitUntil(() => sdk.isInitialized());
     *   sdk.startSession();
     */
    isInitialized(): boolean;
    /**
     * Connects the SDK to the host platform. Must be called exactly once,
     * before any other SDK method except `isInitialized()`.
     *
     * ── LIFECYCLE RULE ──────────────────────────────────────────────────────────
     * MUST be called first. Subsequent calls are warnings + no-ops.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * Recommended call order in your game's bootstrap:
     *   1. `const sdk = GameSDK.create(config)` — create the instance
     *   2. `sdk.initialize()`                   — connect to host  ← HERE
     *   3. `sdk.on('START_GAME', ...)`          — register event listeners
     *   4. `sdk.startSession()`                 — called when player presses Play
     *
     * What this does internally (Phase 3):
     *   - Validates `config.minSDKVersion` against the running SDK version
     *   - Auto-detects the host environment (Flutter WebView / iframe / Standalone)
     *   - Binds the correct BridgeAdapter for that environment transparently
     *   - Wires bridge incoming messages → internal EventManager
     *   - Sends 'INITIALIZE' message to the Flutter host with game identity
     *   - Applies feature flag guards (methods become no-ops when flag is false)
     *
     * Bridge detection is completely automatic. Game code never selects an adapter.
     * See the Architecture section in README.md for the detection decision tree.
     *
     * TODO (Phase 3): Implement full initialization sequence.
     */
    initialize(): void;
    /**
     * Adopts a host-provided session ID as the canonical session ID for the next
     * `startSession()` call.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - MUST be called AFTER `initialize()` and BEFORE `startSession()`.
     * - Calling this AFTER `startSession()` has been called will log an error
     *   and be a no-op. The running session is never retroactively modified.
     * - Calling this before `initialize()` will log a warning and be a no-op.
     * - If called multiple times before `startSession()`, the last value wins.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * Use this when the Wacharlo host creates the authoritative Supabase session
     * asynchronously (e.g. after an auth round-trip) and then passes the resolved
     * session ID to the game before play begins.
     *
     * In embedded mode this is the preferred injection point.
     * In standalone/development mode this method is never called and the SDK
     * generates its own local session ID on `startSession()`.
     *
     * @param sessionId  The canonical session ID string from the host.
     *                   Must be a non-empty string.
     *
     * @example
     *   sdk.initialize();
     *   sdk.adoptSessionId(hostSessionId);  // ← host passes its Supabase session ID
     *   sdk.startSession();                 // ← SDK uses the adopted ID
     */
    adoptSessionId(sessionId: string): void;
    /**
     * Starts a new game session. Call this when the player begins or restarts.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - Requires `initialize()` to have been called first.
     * - ALWAYS creates a brand-new session: new UUID, cleared data snapshot,
     *   cleared achievement session list.
     * - If a session is already active (no `gameOver()` was called),
     *   the previous session is automatically closed silently with a warning.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * @example
     *   // When player presses Play:
     *   playButton.addEventListener('click', () => {
     *     sdk.startSession();
     *     game.start();
     *   });
     *
     *   // When player restarts (new session each time):
     *   sdk.on('RESTART_GAME', () => {
     *     game.reset();
     *     sdk.startSession();
     *   });
     *
     * TODO (Phase 3): Implement.
     */
    startSession(): void;
    /**
     * Signals that the game is paused. Call after stopping your game loop.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - Requires an active session (`startSession()` must have been called).
     * - If no session is active, this is a no-op with a warning.
     * - The SDK does NOT pause your game engine — that is your responsibility.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * @example
     *   sdk.on('REQUEST_PAUSE', () => {
     *     game.pause();   // Stop your engine first
     *     sdk.pause();    // Then notify host
     *   });
     *
     * TODO (Phase 3): Implement.
     */
    pause(): void;
    /**
     * Signals that the game has resumed from a paused state.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - Requires an active session (`startSession()` must have been called).
     * - If no session is active, this is a no-op with a warning.
     * - The SDK does NOT resume your game engine — that is your responsibility.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * @example
     *   sdk.on('REQUEST_RESUME', () => {
     *     sdk.resume();   // Notify host first
     *     game.resume();  // Then restart your engine
     *   });
     *
     * TODO (Phase 3): Implement.
     */
    resume(): void;
    /**
     * Ends the current session and submits the final game result.
     * Call this when the player's run is definitively over.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - Requires an active session (`startSession()` must have been called).
     * - MAY be called ONLY ONCE per session.
     *   Subsequent calls within the same session are no-ops with a warning.
     * - After calling `gameOver()`, call `startSession()` to begin a new run.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * The SDK internally merges `result.data` with the last `report()` snapshot,
     * so you do not need to repeat all fields in `result.data`.
     *
     * @param result  Final game state. All fields are optional.
     *
     * @example
     *   // Minimal:
     *   sdk.gameOver({ score: 4250 });
     *
     *   // With full result:
     *   sdk.gameOver({
     *     score: 4250,
     *     reason: 'player_death',
     *     data: { score: 4250, coins: 18, combo: 7, level: 3 }
     *   });
     *
     * TODO (Phase 3): Implement.
     */
    gameOver(result?: GameResult): void;
    /**
     * Reports the current game state snapshot to the host platform.
     * Call this whenever meaningful game data changes.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - Requires an active session. No-op with warning if called before startSession().
     * - NEVER call every frame — only when meaningful data changes occur.
     *   (score increase, coin collected, life lost, level advanced, etc.)
     * - The SDK throttles rapid consecutive calls internally.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * THE GAME OWNS ALL DATA. This method is a one-way push — it only
     * communicates the snapshot. The SDK never reads back or modifies game values.
     *
     * @param data  Partial snapshot — include only fields that changed.
     *
     * @example
     *   // Score changed:
     *   sdk.report({ score: this.score });
     *
     *   // Multiple fields changed simultaneously:
     *   sdk.report({ score: 150, coins: 5, combo: 3, lives: 2 });
     *
     *   // ❌ Do NOT call every frame:
     *   game.onUpdate(() => sdk.report({ timer: elapsed })); // Too frequent
     *
     * TODO (Phase 3): Implement.
     */
    report(data: Partial<SDKGameData>): void;
    /**
     * Reports that the player has unlocked an achievement.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - Requires an active session.
     * - No-op with warning if `config.supportsAchievements` is `false`.
     * - Duplicate IDs within the same session are silently ignored (no duplicate events sent).
     * - The host is responsible for persisting and displaying the unlock.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * The game decides WHEN an achievement is earned — the SDK only reports it.
     *
     * @param id  Unique, kebab-case achievement identifier.
     *            Convention: 'first-run', 'combo-master-10', 'no-damage-run'
     *
     * @example
     *   if (combo >= 10) {
     *     sdk.unlockAchievement('combo-master-10');
     *   }
     *
     * TODO (Phase 3): Implement.
     */
    unlockAchievement(id: string): void;
    /**
     * Requests the host platform to display the official WachaPlay leaderboard UI.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - Requires `initialize()` to have been called first.
     * - May be called before, during, or after a session (e.g. main menu, end screen).
     * - The SDK does NOT render any UI, fetch leaderboard data, or access Supabase.
     * - Its ONLY responsibility is dispatching a 'SHOW_LEADERBOARD' event to the host.
     * - The host application decides how and when to display the official UI.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * @param payload  Optional additional key-value payload parameters.
     *
     * @example
     *   leaderboardBtn.addEventListener('click', () => {
     *     sdk.showLeaderboard();
     *   });
     */
    showLeaderboard(payload?: Record<string, unknown>): void;
    /**
     * Subscribes to a host platform command or SDK lifecycle event.
     *
     * Use this to react to commands sent by the Flutter host to your game.
     * The most important host commands to listen for:
     *   - 'START_GAME'     → Host tells game to begin
     *   - 'RESTART_GAME'   → Host tells game to restart
     *   - 'REQUEST_PAUSE'  → Host requests game pause
     *   - 'REQUEST_RESUME' → Host requests game resume
     *
     * Returns a cleanup function — call it to unsubscribe. Prefer this over
     * keeping a reference to the callback for use with `off()`.
     *
     * @param event     The event type to listen for.
     * @param callback  Called with the event payload when the event fires.
     * @returns         An unsubscribe function.
     *
     * @example
     *   // Store cleanup functions for later disposal:
     *   const cleanups: Array<() => void> = [];
     *
     *   cleanups.push(sdk.on('START_GAME',    () => game.start()));
     *   cleanups.push(sdk.on('RESTART_GAME',  () => game.reset()));
     *   cleanups.push(sdk.on('REQUEST_PAUSE', () => { game.pause(); sdk.pause(); }));
     *
     *   // On game teardown:
     *   cleanups.forEach(off => off());
     *
     * TODO (Phase 3): Implement.
     */
    on<T = unknown>(event: SDKEventType, callback: EventCallback<T>): () => void;
    /**
     * Unsubscribes a specific callback from an event.
     *
     * Alternative to calling the cleanup function returned by `on()`.
     * Requires storing the original callback reference.
     *
     * Prefer the cleanup function returned by `on()` — it is simpler
     * and does not require storing callback references.
     *
     * @param event     The event type to unsubscribe from.
     * @param callback  The exact callback reference originally passed to `on()`.
     *
     * TODO (Phase 3): Implement.
     */
    off<T = unknown>(event: SDKEventType, callback: EventCallback<T>): void;
    /**
     * Shuts down the SDK cleanly. Call when the game page is unloading or the
     * game component unmounts.
     *
     * ── LIFECYCLE RULES ─────────────────────────────────────────────────────────
     * - MUST be idempotent. Calling multiple times MUST NEVER throw an error.
     * - If a session is active when dispose() is called, it is silently closed.
     * - Safe to call even if initialize() was never called.
     * ────────────────────────────────────────────────────────────────────────────
     *
     * @example
     *   // Register once at game bootstrap:
     *   window.addEventListener('beforeunload', () => sdk.dispose());
     *
     * TODO (Phase 3): Implement teardown in reverse dependency order.
     */
    dispose(): void;
    /**
     * Returns diagnostic information about the SDK's active transport, message
     * telemetry, and error states.
     */
    getDiagnostics(): SDKDiagnostics;
}
//# sourceMappingURL=IGameSDK.d.ts.map