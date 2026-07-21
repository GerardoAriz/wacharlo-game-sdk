import type { SDKMessageType } from '../types/index';

/**
 * IBridgeAdapter
 *
 * Contract for all transport layer implementations in the Wacharlo Game SDK.
 *
 * The bridge is the communication channel between an HTML5 game and the
 * Flutter Game Hub host. Different environments require different adapters:
 *
 *   - `FlutterBridgeAdapter`   → Flutter WebView (mobile: iOS / Android)
 *   - `BrowserBridgeAdapter`   → iframe postMessage (browser / Flutter Web)
 *   - `FallbackBridgeAdapter`  → no-op, for local standalone dev
 *
 * All adapters implement this interface. GameSDK selects the correct one
 * automatically based on environment detection.
 *
 * Design principle:
 *   The adapter only moves messages. It knows nothing about game logic,
 *   scores, or sessions. It is a pure transport layer.
 *
 * TODO: Implement concrete adapter classes in a future `bridge/adapters/` subfolder.
 */
export interface IBridgeAdapter {
  /**
   * Sends a structured message to the host platform.
   *
   * @param message  The fully constructed SDK message envelope.
   *
   * TODO: Implement serialization (JSON.stringify) before transmission.
   * TODO: Handle send failures gracefully and log via Logger.
   */
  send(message: SDKMessageType): void;

  /**
   * Registers the callback that will be invoked when the host sends a
   * message or command to the game.
   *
   * @param handler  Function called with the parsed incoming message.
   *
   * TODO: Validate incoming message shape before calling handler.
   */
  setMessageHandler(handler: (message: SDKMessageType) => void): void;

  /**
   * Tears down all listeners, channel registrations, and window globals
   * created by this adapter.
   *
   * Must be safe to call multiple times (idempotent).
   *
   * TODO: Implement cleanup in each concrete adapter.
   */
  destroy(): void;
}
