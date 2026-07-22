# Changelog

All notable changes to `@wacharlo/game-sdk` will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

> Changes that are planned or in progress but not yet released.

## [1.1.0-rc1] - 2026-07-22

### Added
- **Host Communication API (`sdk.host`)**:
  - Unified generic event dispatcher for game-to-host events via `sdk.host.emit(event, payload, roomId)`.
  - Event listener subscription interface via `sdk.host.on(event, callback)` and `sdk.host.off(event, callback)`.
  - Architecture ready for future `sdk.host.capabilities` API.
- **Social Invitation Platform Actions API (`sdk.social`)**:
  - User-facing social actions `sdk.social.inviteFriend(roomId, payload?)` and `sdk.social.shareRoom(roomId, payload?)`.
- **Standardized Single Envelope (`SDKEventEnvelope`)**:
  - Standardized host communication envelope containing `event`, `timestamp`, `sessionId`, `roomId`, and `payload`.
- **Categorized `SDKEvent` Constants**:
  - Logical namespaces: `ROOM_*` (`ROOM_CREATED`, `ROOM_JOINED`, `ROOM_LEFT`, `ROOM_CLOSED`), `MATCH_*` (`MATCH_PREPARING`, `COUNTDOWN_STARTED`, `MATCH_STARTED`, `MATCH_FINISHED`, `REMATCH_REQUESTED`, `REMATCH_ACCEPTED`), `PLAYER_*` (`PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_READY`, `SCORE_UPDATED`, `PLAYER_DIED`), and `SOCIAL_*` (`INVITE_FRIEND`, `SHARE_ROOM`).
- **Dart JS Interop Wrapper (`wacharlo_game_sdk`)**:
  - Lightweight Dart interop wrapper using `dart:js_interop` exposing `@wacharlo/game-sdk` (single source of truth).

### Planned for Phase 3 (Rope Rush Migration)
- Implement `sdk.initialize()` — bridge detection, version check, INITIALIZE message
- Implement `sdk.isInitialized()` — return internal `_initialized` flag
- Implement `sdk.startSession()` — UUID generation, auto-close previous session, GAME_STARTED message
- Implement `sdk.pause()` / `sdk.resume()` — session guard, GAME_PAUSED / GAME_RESUMED messages
- Implement `sdk.report()` — session guard, snapshot merge, throttled DATA_UPDATED message
- Implement `sdk.gameOver()` — session guard, once-per-session guard, result merge, GAME_OVER message
- Implement `sdk.unlockAchievement()` — feature flag guard, session guard, duplicate guard, ACHIEVEMENT_UNLOCKED
- Implement `sdk.on()` / `sdk.off()` — delegate to internal EventManager
- Implement `sdk.dispose()` — idempotent teardown in reverse dependency order
- Add `BridgeAdapter.detect()` — auto-detect Flutter WebView vs Browser iframe vs Fallback
- Add `FlutterBridgeAdapter` — `flutter_inappwebview` / `WachaPlayChannel` transport
- Add `BrowserBridgeAdapter` — `window.parent.postMessage` transport
- Add `FallbackBridgeAdapter` — no-op logger for standalone dev

### Planned for Phase 4 (Additional Games)
- Real integration examples in `examples/`
- Game slug registry documentation
- Achievement ID naming conventions

### Planned for Phase 5 (Platform Features)
- Cloud save support via Flutter host
- XP delta in game-over payload
- Leaderboard data retrieval (pull model)
- Achievement definitions from Supabase

### Planned for Phase 6 (SDK Hardening)
- Unit test suite
- Re-enable `noUnusedLocals: true` in tsconfig
- Performance profiling
- npm publish workflow

---

## [0.1.1-alpha] — 2026-07-08

### Summary

API freeze release (Phase 2.5). The public SDK contract is now considered **frozen** for v1.0.
No runtime behavior was added. This release refines the public API surface, adds lifecycle
safety documentation, documents the bridge detection architecture, and prepares the SDK
for Phase 3 (Rope Rush migration and full implementation).

---

### Changed

#### `update()` renamed to `report()`

The public method for pushing game state to the host has been renamed:

```typescript
// Before (0.1.0-alpha)
sdk.update({ score: 100 });

// After (0.1.1-alpha) — Breaking change
sdk.report({ score: 100 });
```

**Reason**: `update()` implies the SDK is being changed. `report()` communicates
the actual intent: the game is reporting its current state to the host. The SDK is
a reporter, not an owner.

All references in `IGameSDK.ts`, `GameSDK.ts`, `src/index.ts`, `README.md`, and
`CHANGELOG.md` have been updated.

#### SDK version bumped: `0.1.0-alpha` → `0.1.1-alpha`

- `src/version/index.ts`: `SDK_VERSION = '0.1.1-alpha'`
- `package.json`: `"version": "0.1.1-alpha"`

---

### Added

#### `sdk.isInitialized()` — New public method

Added to `IGameSDK` and implemented in `GameSDK`.

```typescript
if (!sdk.isInitialized()) {
  console.warn('SDK not ready');
  return;
}
sdk.report({ score: this.score });
```

**Purpose**: The only SDK method safe to call before `initialize()`. Allows game code
to safely check SDK readiness in async or deferred contexts.

**Lifecycle rule**: Returns `true` only after `initialize()` completes. Returns `false`
before init and after `dispose()`.

#### Lifecycle safety guards in `GameSDK.ts`

The stub implementation now enforces the following guards before any TODO implementations:

- `_initialized` flag guards `initialize()` against duplicate calls
- `_sessionActive` flag guards `report()`, `pause()`, `resume()`, `unlockAchievement()`, `gameOver()`
- `_sessionOver` flag guards `gameOver()` against being called twice per session
- `supportsAchievements` flag checked in `unlockAchievement()` before any other logic

All guards produce `WARN` log messages and return without throwing.

#### `SDK_LIFECYCLE.md`

Created the authoritative lifecycle reference document at the project root.

Contents:
- Normal lifecycle flow (annotated ASCII diagram)
- State machine diagram (CREATED / INITIALIZED / SESSION_ACTIVE / SESSION_ENDED / DISPOSED)
- Phase-by-phase breakdown with code
- Complete lifecycle safety rules table (all 12 rules)
- 13 edge cases and error scenarios with expected behavior, reason, and recommended handling
- Bridge detection architecture (decision tree)
- Quick reference table of all methods and their safe/unsafe call states

#### README.md — New sections

- **SDK Lifecycle** — annotated flow diagram, link to `SDK_LIFECYCLE.md`
- **Lifecycle Rules** — table of all 12 method rules and violation behaviors
- **Environment Detection** — bridge detection decision tree
- **Developer Best Practices** — 6 best practices with code examples
- **Common Mistakes** — 4 anti-patterns with corrected alternatives
- **FAQ** — 8 common questions with direct answers
- **`sdk.isInitialized()` API reference** — added to Public API Reference section
- **`sdk.report(data)` API reference** — renamed from `update(data)`

---

### Design Decisions

#### Lifecycle contract is part of the public API

Lifecycle safety rules (e.g., `gameOver()` may only be called once per session) are now
explicitly documented in `IGameSDK.ts` via `LIFECYCLE RULES` comment blocks on each method.
Game developers reading the interface see the contract inline, without needing to read an
external document.

#### Guards are in the stub, not just Phase 3

The lifecycle guards (`_initialized`, `_sessionActive`, `_sessionOver`) are implemented
in the current stub `GameSDK.ts` so that:
1. The API contract is testable even before full implementation
2. Phase 3 implementation only needs to fill in the bridge calls — the guards are already present
3. Games migrating early get meaningful warning messages, not silent no-ops

#### `isInitialized()` is the only pre-init-safe method

All other SDK methods require `initialize()` to have been called. `isInitialized()` is the
explicit escape hatch for cases where order cannot be guaranteed (async loading, deferred init).

---

### Known Limitations

- All `GameSDK` public methods remain stubs — lifecycle guards are active, bridge integration is not
- `BridgeAdapter.detect()` not yet implemented — no actual Flutter communication
- `_sessionActive` and `_sessionOver` tracking flags are set in stubs but not used by any real logic yet
- `noUnusedLocals` remains `false` — will be re-enabled in Phase 6

---

### Verified

- `tsc --noEmit` passes with zero errors on the SDK package
- `tsc --noEmit` passes with zero errors on `rope-rush-phase3` (zero changes made to that project)

---

## [0.1.0-alpha] — 2026-07-07

### Summary

Foundation release. Establishes the module architecture, the stable public API contract, and developer documentation. No runtime behavior is implemented yet — all public methods are documented stubs.

This version defines the contract that Phase 3 will implement and Rope Rush will consume first.

---

### Added

#### SDK Structure (Phase 1)

- **Project scaffold** — Standalone TypeScript package at `/Documents/wacharlo-game-sdk/`
- **`package.json`** — Package named `@wacharlo/game-sdk`, version `0.1.0-alpha`, private, devDep on TypeScript 5.x
- **`tsconfig.json`** — Strict mode, ES2022 target, `composite: true` (ready for project references)
- **`src/index.ts`** — Public barrel with clearly separated Primary API, Type exports, and Advanced/Extension surface

#### Modules

- **`src/version/index.ts`** — `SDK_VERSION = '0.1.0-alpha'` constant, single source of truth
- **`src/types/index.ts`** — Shared types: `SDKEventType`, `SDKGameData`, `SDKDeviceInfo`, `SDKSessionMeta`, `SDKMessageType`, `SDKEventPayload`
- **`src/config/GameConfig.ts`** — `GameConfig` interface: `gameSlug`, `gameVersion`, `minSDKVersion`, feature flags (`supportsLeaderboard`, `supportsAchievements`, `supportsCloudSave`, `supportsXP`), optional `displayName` and `locale`
- **`src/logger/Logger.ts`** — `LogLevel` enum (DEBUG/INFO/WARN/ERROR/SILENT) + `Logger` class with per-module prefixed output
- **`src/bridge/IBridgeAdapter.ts`** — `IBridgeAdapter` interface: `send()`, `setMessageHandler()`, `destroy()`
- **`src/bridge/BridgeAdapter.ts`** — Abstract base class for concrete transport implementations
- **`src/events/IEventManager.ts`** — `IEventManager` interface: typed `on()`, `off()`, `emit()`, `clear()`; `EventCallback<T>` type
- **`src/events/EventManager.ts`** — Concrete event bus implementation (stub)
- **`src/session/ISessionManager.ts`** — `ISessionManager` interface: `start()`, `end()`, `getId()`, `isActive()`, `getMeta()`, `getElapsedSeconds()`
- **`src/session/SessionManager.ts`** — Session lifecycle implementation (stub): UUID generation, device detection, timestamps
- **`src/state/IGameDataManager.ts`** — `IGameDataManager` interface: `report()`, `getLastSnapshot()`, `reset()`. Documents the core principle: game owns data, SDK communicates it
- **`src/state/GameDataManager.ts`** — Partial-snapshot courier implementation (stub)
- **`src/achievements/IAchievementManager.ts`** — `IAchievementManager` interface: `unlock()`, `getSessionUnlocks()`, `reset()`; reserved from day one for API stability
- **`src/achievements/AchievementManager.ts`** — Session-scoped achievement tracking (stub)
- **`examples/README.md`** — Planned example roadmap

#### Public API Contract (Phase 2)

- **`src/sdk/IGameSDK.ts`** — `IGameSDK` master interface: flat 9-method API
  - `sdk.version` (getter)
  - `sdk.config` (getter)
  - `sdk.initialize()`
  - `sdk.startSession()`
  - `sdk.pause()`
  - `sdk.resume()`
  - `sdk.gameOver(result?)`
  - `sdk.update(data)`
  - `sdk.unlockAchievement(id)`
  - `sdk.on(event, callback)` → returns cleanup function
  - `sdk.off(event, callback)`
  - `sdk.dispose()`
- **`GameResult`** type — payload for `gameOver()`: `score?`, `data?`, `reason?`
- **`src/sdk/GameSDK.ts`** — Concrete implementation: flat API, private internal managers, static `GameSDK.create(config)` factory. All methods are stubs with detailed Phase 3 implementation TODOs

#### Documentation

- **`README.md`** — Full developer documentation:
  - SDK philosophy
  - Architecture diagram (ASCII)
  - Folder structure
  - Complete public API reference with code examples and field tables
  - Initialization flow
  - Typical game lifecycle
  - Full integration example
  - Design principles (flat API, game owns data, cleanup functions, etc.)
  - Feature flags reference
  - Future roadmap (Phases 3–6)
- **`CHANGELOG.md`** — This file, Keep a Changelog format

---

### Design Decisions

#### Flat API (no nested managers)
The Phase 1 design exposed `sdk.session.start()`, `sdk.data.report()`, `sdk.achievements.unlock()`. Phase 2 flattened these to direct methods: `sdk.startSession()`, `sdk.update()`, `sdk.unlockAchievement()`. Internal managers remain fully private. Games only see `GameSDK`.

This decision mirrors Firebase, Stripe, and Supabase SDK patterns — a single object with a minimal method surface.

#### `dispose()` over `destroy()`
`dispose()` signals intentional, graceful resource cleanup. `destroy()` implies force — not appropriate for a clean shutdown. Aligns with standard patterns in .NET, Java, and modern JS libraries.

#### `GameDataManager` over `ScoreManager`
The SDK is not a score system. Games track score, coins, gems, lives, combo, multiplier, timer, stars, and more. The SDK communicates all of it. Naming it `GameDataManager` reflects that the SDK is a reporter, not an owner.

#### `GameResult` has `score` and `data`
Convenience: most games only have one thing to report on game-over — the score. `sdk.gameOver({ score: 100 })` is ergonomic. Full snapshots use `data: Partial<SDKGameData>` for games that track more.

#### `on()` returns a cleanup function
Preferred pattern for event subscriptions — avoids needing to store callback references. Matches React's `useEffect`, RxJS subscriptions, and modern JS listener patterns.

---

### Known Limitations

- All `GameSDK` public methods are stubs — no runtime behavior yet
- `BridgeAdapter.detect()` not implemented — no actual Flutter communication
- `noUnusedLocals` is set to `false` during the foundation phase; will be re-enabled in Phase 6
- `examples/` directory is empty — reference implementations planned for Phase 4

---

### Verified

- `tsc --noEmit` passes with zero errors on the SDK package
- `tsc --noEmit` passes with zero errors on `rope-rush-phase3` (zero changes made to that project)

---

## [0.2.0-alpha] — TBD

> Phase 3: Rope Rush migration. All stub methods implemented.

---

## [0.3.0-alpha] — TBD

> Phase 4: Second game integration + real-world examples.

---

## [1.0.0] — TBD

> First stable public release. Unit tested, performance profiled, published to npm.
