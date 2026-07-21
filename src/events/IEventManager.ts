import type { SDKEventType } from '../types/index';

/**
 * EventCallback
 *
 * The function signature for all SDK event subscribers.
 * Receives the event type and an optional payload.
 *
 * TODO: Replace `unknown` with a per-event discriminated union type
 *       once each event's payload shape is stable.
 */
export type EventCallback<T = unknown> = (payload: T) => void;

/**
 * IEventManager
 *
 * Contract for the SDK's internal event bus.
 *
 * Responsibilities:
 *   - Allow game code to subscribe to commands sent by the host platform
 *     (e.g. START_GAME, REQUEST_PAUSE, RESTART_GAME)
 *   - Allow SDK modules to emit lifecycle events internally
 *     (e.g. GAME_STARTED, DATA_UPDATED, GAME_OVER)
 *   - Provide clean unsubscribe mechanisms to prevent memory leaks
 *
 * Design note:
 *   This replaces both the existing `eventBridge.on()` / `eventBridge.emit()`
 *   AND the `WachaBridge.on()` patterns during the future Rope Rush migration.
 *   In the SDK, there is ONE event bus — not two.
 *
 * TODO: Decide whether EventManager should be a singleton or per-SDK-instance.
 *       Recommendation: per-SDK-instance (passed in via GameSDK constructor).
 */
export interface IEventManager {
  /**
   * Subscribes to a specific SDK event.
   *
   * @param event     The event type to listen for.
   * @param callback  Called with the event payload when the event fires.
   * @returns         A cleanup function. Call it to unsubscribe.
   *
   * @example
   *   const off = sdk.events.on('START_GAME', () => startGame());
   *   // Later:
   *   off(); // clean unsubscribe
   *
   * TODO: Implement in EventManager.
   */
  on<T = unknown>(event: SDKEventType, callback: EventCallback<T>): () => void;

  /**
   * Unsubscribes a specific callback from an event.
   * Alternative to the cleanup function returned by `on()`.
   *
   * TODO: Implement in EventManager.
   */
  off<T = unknown>(event: SDKEventType, callback: EventCallback<T>): void;

  /**
   * Emits an event internally within the SDK.
   * Used by SDK modules (e.g. SessionManager emits GAME_STARTED after session start).
   *
   * Not typically called by game code directly.
   *
   * TODO: Implement in EventManager.
   * TODO: Decide if game code should have emit access or only SDK modules.
   */
  emit<T = unknown>(event: SDKEventType, payload?: T): void;

  /**
   * Removes all subscribers for all events.
   * Called during GameSDK.destroy().
   *
   * TODO: Implement in EventManager.
   */
  clear(): void;
}
