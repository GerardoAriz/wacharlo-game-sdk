# @wacharlo/game-sdk — SDK Lifecycle

> **Version**: 0.1.1-alpha  
> This document is the authoritative reference for the SDK lifecycle contract.
> It defines the required call order, every safety rule, and the expected behavior
> for all edge cases and error conditions.

---

## Table of Contents

1. [Normal Lifecycle Flow](#1-normal-lifecycle-flow)
2. [Lifecycle Diagram](#2-lifecycle-diagram)
3. [Phase-by-Phase Breakdown](#3-phase-by-phase-breakdown)
4. [Lifecycle Safety Rules](#4-lifecycle-safety-rules)
5. [Edge Cases & Error Scenarios](#5-edge-cases--error-scenarios)
6. [Bridge Detection Architecture](#6-bridge-detection-architecture)
7. [Quick Reference](#7-quick-reference)

---

## 1. Normal Lifecycle Flow

```
Game starts
    │
    ▼
GameSDK.create(config)
    │  Creates instance. No connection yet.
    │  Config is frozen and immutable from this point.
    │
    ▼
sdk.initialize()
    │  Connects to host. May only succeed once.
    │  Auto-detects: Flutter WebView | Browser iframe | Dev fallback
    │  Sends INITIALIZE message to Flutter host.
    │
    ▼
sdk.on('START_GAME', ...)        ← Register event listeners
sdk.on('RESTART_GAME', ...)      ← Can be called before or after initialize()
sdk.on('REQUEST_PAUSE', ...)
sdk.on('REQUEST_RESUME', ...)
    │
    ▼
sdk.startSession()               ← Player presses Play
    │  New UUID generated. Data snapshot reset. Achievement list reset.
    │  Sends GAME_STARTED message to host.
    │
    ├──▶ sdk.report({ score, coins, lives, ... })
    │         Game reports state changes. Throttled internally.
    │         Sends DATA_UPDATED message to host.
    │
    ├──▶ sdk.pause()
    │         Sends GAME_PAUSED message. Does NOT pause your engine.
    │
    ├──▶ sdk.resume()
    │         Sends GAME_RESUMED message. Does NOT resume your engine.
    │
    ├──▶ sdk.unlockAchievement('combo-master-10')
    │         Reports unlock to host. Duplicate IDs ignored silently.
    │
    └──▶ sdk.report({ score: 4250 })    ← Final report before game over
    │
    ▼
sdk.gameOver({ score: 4250, reason: 'player_death' })
    │  Session ends. Result sent to host.
    │  Leaderboard submission triggered (if supportsLeaderboard).
    │  Cloud save triggered (if supportsCloudSave).
    │  Session is now CLOSED. Cannot call gameOver() again on this session.
    │
    │   ╔═══════════════════════════════════════════╗
    │   ║  Player can now restart → startSession()  ║
    │   ╚═══════════════════════════════════════════╝
    │
    ▼
sdk.dispose()                    ← Page unloads or game unmounts
    │  Idempotent — safe to call multiple times.
    │  Closes any active session silently.
    │  Clears all event listeners.
    │  Destroys bridge adapter.
    │
    ▼
  [SDK instance is dead — create a new one for the next page load]
```

---

## 2. Lifecycle Diagram

```
States:    [CREATED] → [INITIALIZED] → [SESSION_ACTIVE] → [SESSION_ENDED] → [DISPOSED]
                                              ↑_____________________|
                                           (startSession() loops here)

Methods and the states they require / transition to:

  GameSDK.create()        → [CREATED]
  sdk.initialize()        → [CREATED]        → [INITIALIZED]
  sdk.isInitialized()     → any state        → (no change, read-only)
  sdk.on() / sdk.off()    → any state        → (no change, just registers)
  sdk.startSession()      → [INITIALIZED]    → [SESSION_ACTIVE]
                          → [SESSION_ENDED]  → [SESSION_ACTIVE]  (restart)
                          → [SESSION_ACTIVE] → [SESSION_ACTIVE]  (warning, auto-close prev)
  sdk.pause()             → [SESSION_ACTIVE] → (no state change)
  sdk.resume()            → [SESSION_ACTIVE] → (no state change)
  sdk.unlockAchievement() → [SESSION_ACTIVE] → (no state change)
  sdk.showLeaderboard()   → any post-init    → (no state change, dispatches event)
  sdk.gameOver()          → [SESSION_ACTIVE] → [SESSION_ENDED]
  sdk.dispose()           → any state        → [DISPOSED]
```

---

## 3. Phase-by-Phase Breakdown

### Phase 1 — Bootstrap

**Required. Happens once per page load.**

```typescript
const sdk = GameSDK.create({
  gameSlug: 'rope-rush',
  gameVersion: '3.0.0',
  minSDKVersion: '0.1.0',
  supportsLeaderboard: true,
  supportsAchievements: false,
  supportsCloudSave: false,
  supportsXP: false,
});

sdk.initialize();
```

- `create()` — allocates the instance, freezes config. No network activity.
- `initialize()` — detects the host environment, binds the bridge, sends the `INITIALIZE` message.

### Phase 2 — Event Registration

**Recommended immediately after `initialize()`. Can be called before `startSession()`.**

```typescript
sdk.on('START_GAME',    () => game.start());
sdk.on('RESTART_GAME',  () => { game.reset(); sdk.startSession(); });
sdk.on('REQUEST_PAUSE', () => { game.pause(); sdk.pause(); });
sdk.on('REQUEST_RESUME',() => { sdk.resume(); game.resume(); });
```

Store the returned cleanup functions for use in `dispose()`.

### Phase 3 — Session (per player run)

**Repeated every time the player plays.**

```typescript
// Player presses Play:
sdk.startSession();

// During gameplay (only on meaningful changes):
sdk.report({ score: this.score });
sdk.report({ score: 450, coins: 5, combo: 3 });

// On pause/resume:
sdk.pause();
sdk.resume();

// On achievement:
sdk.unlockAchievement('first-run');

// When run ends:
sdk.gameOver({ score: 4250, reason: 'player_death' });

// Player can now restart → call startSession() again
```

### Phase 4 — Teardown

**Once per page unload.**

```typescript
window.addEventListener('beforeunload', () => sdk.dispose());
```

---

## 4. Lifecycle Safety Rules

These rules are part of the public contract. They will be enforced in Phase 3.
Violations produce `console.warn` messages, never thrown exceptions.

### `initialize()`

| Rule | Behavior |
|------|----------|
| MAY only succeed once | Second call → Logs `WARN: initialize() called more than once — ignoring.` + no-op |
| MUST be called before any other method except `isInitialized()` | Other methods called before init → Logs `WARN: <method_name>() called before initialize().` + no-op |

### `startSession()`

| Rule | Behavior |
|------|----------|
| Requires `initialize()` first | Logs `WARN: startSession() called before initialize(). Call sdk.initialize() first.` + no-op |
| ALWAYS creates a new session | New UUID, reset data snapshot, reset achievement list |
| If session already active | Logs `WARN: startSession() called while a session is already active. Closing the previous session automatically.` + closes previous silently |

### `report(data)`

| Rule | Behavior |
|------|----------|
| Requires active session | Logs `WARN: report() called with no active session. Call startSession() first.` + no-op |
| Do NOT call every frame | Internal throttle: max ~10 calls/second |
| Never modifies game values | Read-only push — game always owns the data |

### `pause()` / `resume()`

| Rule | Behavior |
|------|----------|
| Requires active session | Logs `WARN: pause()/resume() called with no active session. Call startSession() first.` + no-op |
| Does NOT control game engine | Game must pause/resume its own loop separately |

### `gameOver(result?)`

| Rule | Behavior |
|------|----------|
| Requires active session | Logs `WARN: gameOver() called with no active session.` + no-op |
| MAY be called ONCE per session | Logs `WARN: gameOver() called more than once in the same session — ignoring. A session can only end once.` + no-op |
| After gameOver() → call startSession() to restart | Calling other methods without startSession() → warning logs |

### `unlockAchievement(id)`

| Rule | Behavior |
|------|----------|
| Requires active session | Logs `WARN: unlockAchievement() called with no active session.` + no-op |
| Requires `supportsAchievements: true` | Logs `WARN: unlockAchievement(...) called but config.supportsAchievements is false — ignoring.` + no-op |
| Duplicate ID in same session | Silently ignored — no duplicate event sent to host |

### `showLeaderboard()`

| Rule | Behavior |
|------|----------|
| Requires `initialize()` | Logs `WARN: showLeaderboard() called before initialize().` + no-op |
| Post-init invocation | Safe anytime post-initialization (before session, during session, or after gameOver) |
| UI Rendering & Data | SDK does NOT render UI, query Supabase, or fetch rankings — dispatches transport event ONLY |

### `dispose()`

| Rule | Behavior |
|------|----------|
| MUST be idempotent | Calling multiple times MUST NEVER throw |
| Safe before `initialize()` | No-op cleanly if nothing was initialized |
| If session is active | Session is closed silently (no GAME_OVER message sent) |


---

## 5. Edge Cases & Error Scenarios

### SDK State Errors

---

**`initialize()` called twice**

> *Scenario*: Game code calls `sdk.initialize()` in two places.

| | |
|-|-|
| **Expected** | Second call is a no-op. A `WARN` is logged: `initialize() called more than once — ignoring. The SDK may only be initialized once per instance.` |
| **Reason** | Prevents double bridge setup, duplicate INITIALIZE messages, double event listeners. |
| **Recommended handling** | Use `sdk.isInitialized()` before calling initialize() if there is any uncertainty. |

---

**`gameOver()` called twice in the same session**

> *Scenario*: Game has duplicate game-over triggers (e.g., both a timer and a death event fire simultaneously).

| | |
|-|-|
| **Expected** | Second call is a no-op. A `WARN` is logged: `gameOver() called more than once in the same session — ignoring. A session can only end once.` |
| **Reason** | Prevents duplicate leaderboard submissions and corrupted session data. |
| **Recommended handling** | Track a `gameIsOver` boolean in your game and guard `gameOver()` calls yourself. |

---

**`startSession()` without previous `gameOver()`**

> *Scenario*: Player restarts without the previous session being formally closed.

| | |
|-|-|
| **Expected** | `WARN` logged: `startSession() called while a session is already active. Closing the previous session automatically.` Previous session is closed silently. New session starts normally. |
| **Reason** | Games must not crash or require explicit close calls on restart. The SDK is resilient. |
| **Recommended handling** | Always call `gameOver()` before allowing restarts. But the SDK handles the case if you don't. |

---

**`pause()` or `resume()` before `startSession()`**

> *Scenario*: Host sends `REQUEST_PAUSE` before the player has started a game.

| | |
|-|-|
| **Expected** | No-op. `WARN` logged: `pause() called with no active session. Call startSession() first.` or `resume() called with no active session. Call startSession() first.` |
| **Reason** | There is nothing to pause — no session context exists. |
| **Recommended handling** | Check `sdk.isInitialized()` before forwarding host commands to SDK methods. |


---

**`dispose()` before `initialize()`**

> *Scenario*: Game component unmounts before bootstrap completes.

| | |
|-|-|
| **Expected** | No-op. No errors thrown. Nothing to clean up. |
| **Reason** | `dispose()` must be idempotent and safe at all times. |
| **Recommended handling** | Always register `dispose()` in `beforeunload`. The SDK handles the rest. |

---

### Host Environment Errors

---

**Browser without Flutter (standalone dev mode)**

> *Scenario*: Game is opened directly in a browser — no Flutter host detected.

| | |
|-|-|
| **Expected** | `FallbackBridgeAdapter` is selected automatically. All SDK calls succeed. Messages are logged to console only, not transmitted. |
| **Reason** | Games must be fully runnable in a browser for development and testing. |
| **Recommended handling** | No action needed. The FallbackAdapter is transparent. |

---

**Flutter disconnects during gameplay**

> *Scenario*: WebView loses its JavaScript channel mid-session.

| | |
|-|-|
| **Expected** | Bridge `send()` calls fail silently — logged as `WARN`. The game continues running. |
| **Reason** | Network or channel failures must not crash the game. |
| **Recommended handling** | Implement a `WARN`-level listener on the bridge (Phase 3). Consider a reconnect strategy for critical features (leaderboard). |

---

**Lost internet connection**

> *Scenario*: Device goes offline during gameplay.

| | |
|-|-|
| **Expected** | SDK continues to function normally. Bridge messages may queue or fail silently depending on the adapter. Leaderboard and cloud save will fail gracefully. |
| **Reason** | Offline gameplay must always be possible. |
| **Recommended handling** | The Flutter host is responsible for queuing leaderboard submissions when offline. The SDK does not retry. |

---

**Duplicate session IDs (UUID collision)**

> *Scenario*: Extremely unlikely. Two sessions generate the same UUID.

| | |
|-|-|
| **Expected** | The host (Flutter / Supabase) handles deduplication by session ID + timestamp. The SDK itself does not validate uniqueness. |
| **Reason** | UUID v4 collision probability is negligible (~1 in 5.3 × 10^36). Server-side deduplication is the correct layer. |
| **Recommended handling** | No action needed in the SDK. |

---

**Invalid `GameConfig` (Phase 3)**

> *Scenario*: `gameSlug` is empty, `gameVersion` is not semver, etc.

| | |
|-|-|
| **Expected** | `create()` throws a descriptive `TypeError` **before** any SDK state is set. |
| **Reason** | Config errors should fail early and loudly — not silently produce bad data in production. |
| **Recommended handling** | Fix the config. This is a programming error, not a runtime condition. |

---

**Unsupported SDK version**

> *Scenario*: `config.minSDKVersion` is `'1.0.0'` but the running `SDK_VERSION` is `'0.1.1-alpha'`.

| | |
|-|-|
| **Expected** | `initialize()` logs a `WARN` and continues. In Phase 3+, may throw if major version mismatch. |
| **Reason** | Alpha versions should warn but not block. Post-v1.0, strict version enforcement is appropriate. |
| **Recommended handling** | Keep `minSDKVersion` up to date with the SDK you test against. |

---

**Host rejects a score**

> *Scenario*: Flutter host validates the score server-side and rejects it (anti-cheat, format error).

| | |
|-|-|
| **Expected** | The SDK receives a rejection message via the bridge and emits a `SCORE_REJECTED` event (future). The game receives this via `sdk.on('SCORE_REJECTED', ...)`. |
| **Reason** | Score validation happens server-side, not in the game. The SDK is the messenger. |
| **Recommended handling** | Listen for rejection events (Phase 5). Show a friendly message to the player. |

---

**Achievement unlocked twice**

> *Scenario*: `sdk.unlockAchievement('first-run')` is called twice in the same session.

| | |
|-|-|
| **Expected** | First call: event sent to host. Second call: silently ignored (SDK-level dedup within session). |
| **Reason** | The host persists achievements — deduplication at the host layer handles cross-session. SDK-level dedup prevents redundant messages within one session. |
| **Recommended handling** | The SDK handles this transparently. No action required. |

---

## 6. Bridge Detection Architecture

Bridge detection happens inside `initialize()` and is completely invisible to game code. Games never select or configure an adapter.

```
sdk.initialize() is called
    │
    ▼
BridgeAdapter.detect() [internal]
    │
    ├── Is window.flutter_inappwebview defined?
    │   OR Is window.WachaPlayChannel defined?
    │     └── YES → FlutterBridgeAdapter
    │                  Sends via flutter_inappwebview.callHandler()
    │                  or WachaPlayChannel.postMessage()
    │                  Receives via window.receiveWachaPlayMessage()
    │
    ├── Is window.parent !== window? (running in iframe)
    │     └── YES → BrowserBridgeAdapter
    │                  Sends via window.parent.postMessage()
    │                  Receives via window.addEventListener('message')
    │
    └── None of the above?
          └── FallbackBridgeAdapter
                  No transmission — logs all messages to console
                  Used for: standalone browser dev, unit tests
```

### Why games never choose adapters

- Bridge selection is environment-specific and must be automatic.
- A game should not need to know whether it is running inside a Flutter WebView or a browser iframe — that is an infrastructure concern, not a game concern.
- If the detection logic changes (e.g., a new Flutter plugin), only the SDK is updated. Zero changes to any game.

### Custom adapters (advanced)

If you need a non-standard transport (e.g. React Native WebView, Unity WebGL bridge), custom bridge adapters extending `BridgeAdapter` can be integrated internally. For all standard games, the default auto-detection path is always preferred and handles all supported environment channels transparently.


---

## 7. Quick Reference

### Method Call Order

```
GameSDK.create(config)          ← Always first
    → sdk.initialize()          ← Before anything else
        → sdk.on(...)           ← Register listeners
            → sdk.startSession()     ← Player plays
                → sdk.report(...)    ← Data changes
                → sdk.pause()        ← Paused
                → sdk.resume()       ← Resumed
                → sdk.unlockAchievement() ← Milestone
                → sdk.gameOver(...)  ← Run ends
            → sdk.startSession()     ← Player restarts
    → sdk.dispose()             ← Page unloads
```

### `isInitialized()` Usage Guide

```typescript
// ✅ Use before SDK calls in async/deferred contexts:
if (sdk.isInitialized()) {
  sdk.report({ score: this.score });
}

// ✅ Use in loading screens:
while (!sdk.isInitialized()) {
  await sleep(50);
}
sdk.startSession();

// ❌ Do NOT use as a replacement for proper lifecycle management:
// If your code requires polling isInitialized(), restructure so that
// initialize() is called before any SDK-dependent code runs.
```

### Lifecycle Violations Quick Reference

| Call | Without | Result |
|------|---------|--------|
| `initialize()` | Nothing | ✅ Works |
| `startSession()` | `initialize()` | Logs `WARN: startSession() called before initialize(). Call sdk.initialize() first.` + no-op |
| `report()` | `startSession()` | Logs `WARN: report() called with no active session. Call startSession() first.` + no-op |
| `pause()` | `startSession()` | Logs `WARN: pause() called with no active session. Call startSession() first.` + no-op |
| `resume()` | `startSession()` | Logs `WARN: resume() called with no active session. Call startSession() first.` + no-op |
| `unlockAchievement()` | `startSession()` | Logs `WARN: unlockAchievement() called with no active session.` + no-op |
| `gameOver()` | `startSession()` | Logs `WARN: gameOver() called with no active session.` + no-op |
| `gameOver()` twice | — | Logs `WARN: gameOver() called more than once in the same session — ignoring. A session can only end once.` + no-op |
| `initialize()` twice | — | Logs `WARN: initialize() called more than once — ignoring.` + no-op |
| `dispose()` any time | — | ✅ Safe (idempotent) |

