/**
 * GameConfig
 *
 * The identity and capability contract that every Wacharlo game must provide
 * when initializing the SDK. This replaces scattered `gameId`, `version`, and
 * feature flag parameters that would otherwise be passed around individually.
 *
 * Every module inside the SDK reads from this config. Future features (cloud
 * save, XP, leaderboard) are opt-in via boolean flags — games that don't
 * support a feature simply set it to `false`.
 *
 * @example
 *   const config: GameConfig = {
 *     gameSlug: 'rope-rush',
 *     gameVersion: '3.0.0',
 *     minSDKVersion: '0.1.0',
 *     supportsLeaderboard: true,
 *     supportsAchievements: false,
 *     supportsCloudSave: false,
 *     supportsXP: false,
 *   };
 *   const sdk = GameSDK.create(config);
 */
export interface GameConfig {
  /**
   * Unique, URL-safe identifier for this game across the Wacharlo platform.
   * Used as a namespace key for localStorage, Supabase records, and leaderboards.
   *
   * Convention: kebab-case, e.g. 'rope-rush', 'rocket-lander', 'tiny-keeper'
   */
  gameSlug: string;

  /**
   * Semantic version of the game build currently running.
   * Sent with every bridge message for telemetry and debugging.
   *
   * Convention: semver string, e.g. '3.0.0', '1.2.1'
   */
  gameVersion: string;

  /**
   * Minimum SDK version this game is compatible with.
   * The SDK will emit a warning (and eventually error) if the running
   * SDK_VERSION is lower than this value.
   *
   * TODO: Implement version compatibility check in GameSDK.initialize().
   */
  minSDKVersion: string;

  // ── Feature Flags ──────────────────────────────────────────────────────────
  // These flags let the Flutter host know which capabilities to enable
  // in its UI before the game even loads (e.g. show/hide leaderboard button).

  /**
   * Whether this game participates in Wacharlo leaderboards.
   * When true, the SDK will enable leaderboard request events.
   *
   * TODO: Validate during initialize(); disable leaderboard API if false.
   */
  supportsLeaderboard: boolean;

  /**
   * Whether this game supports unlockable achievements.
   * When true, AchievementManager is active and achievement events flow
   * through the bridge.
   *
   * TODO: Validate during initialize(); disable achievement API if false.
   */
  supportsAchievements: boolean;

  /**
   * Whether this game supports cloud save (Supabase persistence).
   * When true, session data will be persisted server-side via the Flutter host.
   *
   * TODO: Define cloud save data shape in a future `cloud/` module.
   */
  supportsCloudSave: boolean;

  /**
   * Whether this game participates in the Wacharlo XP / progression system.
   * When true, game-over events will include XP deltas.
   *
   * TODO: Add `xpEarned` field to SDKGameData when this is implemented.
   */
  supportsXP: boolean;

  /**
   * Optional display name shown in UI and logs.
   * Falls back to `gameSlug` if not provided.
   *
   * TODO: Use in Logger prefix and in INITIALIZE bridge message.
   */
  displayName?: string;

  /**
   * Optional locale override for this game instance.
   * Falls back to the device language detected by SessionManager.
   *
   * TODO: Pass to host platform on INITIALIZE for localized UI strings.
   */
  locale?: string;
}
