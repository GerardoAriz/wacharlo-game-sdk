/**
 * IAchievementManager
 *
 * Contract for achievement unlock reporting in the Wacharlo Game SDK.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why this module exists from day one
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every Wacharlo game will eventually have achievements. If this module is
 * added later, it would require changing the public `IGameSDK` interface and
 * breaking existing consumers. By reserving it now, the API stays stable.
 *
 * The game decides WHEN an achievement is unlocked — not the SDK.
 * The SDK only reports the unlock to the Flutter host via the bridge.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Future capabilities (not in scope yet):
 *   - Achievement progress tracking (e.g. "collect 50 coins")
 *   - Achievement definitions fetched from Supabase
 *   - Batch unlock (multiple achievements at once)
 *   - Re-unlock prevention (server-side deduplication)
 *
 * TODO: Define the achievement metadata shape (id, name, description, icon, rarity).
 * TODO: Connect to Supabase via the Flutter host for persistence.
 */
export interface IAchievementManager {
  /**
   * Reports that the player has unlocked an achievement.
   *
   * The SDK transmits this to the Flutter host via the bridge.
   * The host is responsible for persisting, displaying, and deduplicating.
   *
   * @param achievementId  Unique, URL-safe identifier for the achievement.
   *                       Convention: kebab-case, e.g. 'first-run', 'combo-master-50'
   *
   * @example
   *   sdk.achievements.unlock('first-run');
   *   sdk.achievements.unlock('combo-master-50');
   *
   * TODO: Implement in AchievementManager.
   * TODO: Validate that `config.supportsAchievements` is true before sending.
   *       Log a warning and no-op if achievements are disabled for this game.
   */
  unlock(achievementId: string): void;

  /**
   * Returns the list of achievement IDs unlocked during the current session.
   *
   * Note: This is a session-scoped in-memory list only.
   * Persistent achievement history lives in the Flutter host / Supabase.
   *
   * TODO: Implement in AchievementManager.
   */
  getSessionUnlocks(): string[];

  /**
   * Clears the session unlock list.
   * Called when a new session starts.
   *
   * TODO: Implement in AchievementManager.
   */
  reset(): void;
}
