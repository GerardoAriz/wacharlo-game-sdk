# Wacharlo Game SDK — Transport Layer Architecture

This document outlines the design, execution flows, and integration guidelines for the unified transport layer inside `@wacharlo/game-sdk`.

The transport layer acts as the **single source of truth** for all communication between HTML5 games and the Wacharlo host (whether it is a native mobile WebView wrapper, an iframe embed, or standalone browser play).

---

## 1. Transport Class Hierarchy

All transport mechanisms derive from the base abstract `Transport` class:

```
                  ┌──────────────────────┐
                  │ Transport (Abstract) │
                  └──────────┬───────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
┌───────────────┐     ┌──────────────┐     ┌──────────────┐
│FlutterWebView │     │   Browser    │     │  Standalone  │
│   Transport   │     │  Transport   │     │  Transport   │
└───────────────┘     └──────────────┘     └──────────────┘
                                                   │ (during localhost
                                                   ▼  development/test)
                                           ┌──────────────┐
                                           │     Mock     │
                                           │  Transport   │
                                           └──────────────┘
```

### Core Abstractions

*   **`Transport`**: Standard base class maintaining diagnostics state (e.g. `messagesSentCount`, `messagesReceivedCount`, `lastError`, and `initTime`) and formatting the diagnostics payload returned by `getDiagnostics()`.
*   **`FlutterWebViewTransport`**: Communicates with native iOS/Android hosts via `window.WachaPlayChannel` or `window.flutter_inappwebview`. Receives callbacks on `window.receiveWachaPlayMessage`.
*   **`BrowserTransport`**: Communicates with web/iframe parent hosts via `window.parent.postMessage`. Receives callbacks via the standard window `'message'` listener.
*   **`StandaloneTransport`**: Handles situations where the game is loaded directly as a standalone page. Outbound messages write to the developer console log.
*   **`MockTransport`**: Selected automatically on `localhost` or during unit test suite execution. It stores sent messages in-memory for testing assertions and enables mock inbound triggers via `mockReceive()`.

---

## 2. Runtime Auto-Detection Flow

During `initialize()`, the SDK dynamically evaluates the environment and binds the appropriate transport strategy. The selection order is strictly prioritized:

```
                   sdk.initialize() is called
                                │
                                ▼
                       Is window defined?
                                │
                 ┌──────────────┴──────────────┐
                 ▼ (No)                        ▼ (Yes)
           [MockTransport]            Is WachaPlayChannel or
                                    flutter_inappwebview defined?
                                               │
                                 ┌─────────────┴─────────────┐
                                 ▼ (Yes)                     ▼ (No)
                       [FlutterWebViewTransport]       Is window.parent !==
                                                        window? (iframe)
                                                                 │
                                                   ┌─────────────┴─────────────┐
                                                   ▼ (Yes)                     ▼ (No)
                                            [BrowserTransport]         Is local host?
                                                                      (localhost/127.0.0.1)
                                                                               │
                                                                 ┌─────────────┴─────────────┐
                                                                 ▼ (Yes)                     ▼ (No)
                                                           [MockTransport]           [StandaloneTransport]
```

---

## 3. Host Communication & Message Lifecycle

The SDK provides a structured lifecycle wrapper. Outgoing messages are converted into standard `SDKMessageType` envelopes:

### Outbound Envelope Structure
```typescript
interface SDKMessageType {
  event: SDKEventType;       // e.g. "GAME_STARTED"
  type: SDKEventType;        // Legacy type field for backward compatibility
  gameId: string;            // Resolved game slug
  gameVersion: string;       // Game semantic version
  sdkVersion: string;        // Running SDK version
  timestamp: number;         // Epoch timestamp
  sessionId: string;         // Unique UUID v4 for the play session
  device: SDKDeviceInfo;     // OS, language, layout type, and pixel ratio
  data: Partial<SDKGameData>;// Latest aggregated state reported by the game
  payload?: SDKEventPayload; // Event-specific extra arguments
}
```

### Lifecycle flow:

1.  **Game calls `sdk.report(data)`**: State is merged into a pending snapshot.
2.  **SDK Throttler**: The SDK limits updates to a maximum of 10 transmissions per second (100ms window) to conserve host resources.
3.  **Transport dispatch**: When the throttle timer fires, the active transport serializes the envelope and posts it to the respective host container.
4.  **Instant flush**: Calling `sdk.gameOver()` bypasses/flushes any pending throttled report data immediately before sending the final `GAME_OVER` payload.

---

## 4. Diagnostics & Troubleshooting API

You can inspect the transport layer's current state and message logs by calling:

```typescript
const stats = sdk.getDiagnostics();
```

This returns an `SDKDiagnostics` object with the following fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `activeTransport` | `string` | Class name of the active transport strategy. |
| `hostDetected` | `boolean` | `true` if a host interface is detected in the runtime. |
| `deliveryMethod` | `string` | Medium description (e.g. `window.WachaPlayChannel`, `console`, `mock`). |
| `sdkVersion` | `string` | The version of the running SDK. |
| `messagesSent` | `number` | Count of successfully serialized envelopes dispatched. |
| `messagesReceived` | `number` | Count of messages received from the host container. |
| `pendingMessages` | `number` | Messages queued (currently `0` as ACK flows are disabled). |
| `lastMessage` | `SDKMessageType` | A copy of the last sent envelope. |
| `lastError` | `string \| null` | The last serialization or runtime channel error message. |
| `lastTransportFailure`| `string \| null` | String identifier representing the failure category. |
| `transportInitializationTime`| `number` | Epoch millisecond timestamp of initialization. |

---

## 5. Backward Compatibility & Migration

To ensure that existing Phaser integrations continue to compile and function without modification:

- **`BridgeAdapter` Wrapper**: The class `BridgeAdapter` remains exposed as a public export. However, it has been refactored under the hood to act as a wrapper delegating all calls directly to the auto-detected `Transport` instance.
- **Legacy Envelopes**: Every message envelope replicates the `event` field under the legacy name `type` so that older Flutter webview scripts successfully deserialize events.

### To Migrate Custom Adapters:
If you previously wrote a custom `BridgeAdapter` subclass, migrate it by extending `Transport` and providing implementation details for:
- `initialize(): void`
- `send(message: SDKMessageType): void`
- `destroy(): void`
- `isHostDetected(): boolean`
- `getDeliveryMethod(): string`
