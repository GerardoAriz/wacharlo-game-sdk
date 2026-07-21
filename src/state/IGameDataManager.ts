import type { SDKGameData } from '../types/index';

/**
 * IGameDataManager
 *
 * Contract for the SDK's game data communication layer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CORE DESIGN PRINCIPLE — READ THIS FIRST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The SDK NEVER owns game data. The game always owns its data.
 *
 * The game decides:
 *   - What the score is
 *   - How many coins the player has
 *   - How many lives remain
 *   - What combo level was reached
 *   - What the timer shows
 *
 * The SDK only:
 *   - Accepts a snapshot of that data via `report()`
 *   - Serializes and forwards it to the Flutter host via BridgeAdapter
 *   - Caches the last reported snapshot for inclusion in GAME_OVER messages
 *
 * This is why the class is called GameDataManager — not ScoreManager.
 * Score is just one of many data fields the SDK will eventually communicate:
 *   score, coins, gems, lives, combo, multiplier, timer, powerups, stars, xp, etc.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TODO: Consider adding a `subscribe()` method so the host can request
 *       the current data snapshot at any time (pull model vs push model).
 */
export interface IGameDataManager {
  /**
   * Accepts a partial snapshot of the game's current data and communicates
   * it to the Flutter host via the bridge.
   *
   * The game pushes data; the SDK forwards it. That's all.
   *
   * @param data  A partial snapshot — only include fields that changed.
   *              The manager merges this with the last known snapshot.
   *
   * @example
   *   // Only score changed this frame:
   *   sdk.data.report({ score: 450 });
   *
   *   // Multiple fields changed:
   *   sdk.data.report({ score: 450, coins: 12, combo: 3, lives: 2 });
   *
   *   // Game over — full snapshot:
   *   sdk.data.report({ score: 450, coins: 12, combo: 0, lives: 0, timer: 62.5 });
   *
   * TODO: Implement in GameDataManager.
   * TODO: Throttle rapid calls to avoid flooding the bridge (e.g. max 10/sec).
   */
  report(data: Partial<SDKGameData>): void;

  /**
   * Returns the last data snapshot that was reported via `report()`.
   * Returns `null` if `report()` has never been called.
   *
   * Used internally by GameSDK to build GAME_OVER messages.
   *
   * TODO: Implement in GameDataManager.
   */
  getLastSnapshot(): Readonly<Partial<SDKGameData>> | null;

  /**
   * Clears the cached data snapshot.
   * Typically called when a new session starts (game restart).
   *
   * TODO: Implement in GameDataManager.
   */
  reset(): void;
}
