# @wacharlo/game-sdk

> **Version**: `2.0.0-rc.1` — Game-Agnostic Communication Bridge  
> **Status**: Release Candidate. Game-agnostic multiplayer communication bridge.

The official integration layer between all Wacharlo HTML5 games and the **Wacharlo Flutter Game Hub**.

Every game uses one SDK. One SDK talks to one host. Clean boundary.

> [!IMPORTANT]
> **Game-Agnostic SDK & Room Ownership Rule**
> - **Game-Agnostic**: The SDK is completely game-agnostic and contains no game-specific logic or imports. It works out-of-the-box for any current or future game (e.g. Rope Rush, Tiny Keeper, Rocket Lander, Swing Hero, Flappy Chícharo).
> - **Room Ownership**: *Room ownership belongs to the game implementation. The SDK does not own, generate, or manage Room IDs.*
> - **Pure Communication Bridge**: The SDK only forwards standardized events and envelopes bi-directionally between the Game and WacharloApp.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [Public API Reference](#public-api-reference)
5. [Initialization Flow](#initialization-flow)
6. [SDK Lifecycle](#sdk-lifecycle)
7. [Lifecycle Rules](#lifecycle-rules)
8. [Environment Detection](#environment-detection)
9. [Example Integration](#example-integration)
10. [Design Principles](#design-principles)
11. [Developer Best Practices](#developer-best-practices)
12. [Common Mistakes](#common-mistakes)
13. [Feature Flags](#feature-flags)
14. [FAQ](#faq)
15. [Future Roadmap](#future-roadmap)

---

## Philosophy

> **The game owns its data. The SDK owns the channel.**

The Wacharlo Game SDK has one job: be a reliable, transparent communication layer between an HTML5 game and the Flutter host that wraps it.

It does not:
- Decide how many points a player earns
- Store authoritative game state
- Make gameplay decisions
- Replace your game engine

It does:
- Identify your game to the platform
- Manage the session lifecycle
- Forward your game's data to the Flutter host
- Deliver host commands to your game (pause, resume, restart)
- Report achievement unlocks
- Provide structured logging

This philosophy keeps games portable: the same game logic can run standalone in a browser, inside a Flutter WebView, or in any future host — by swapping adapters, not rewriting games.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HTML5 Game                             │
│                                                             │
│   GameSDK.create(config)                                    │
│   sdk.initialize() → sdk.startSession() → sdk.update() ...  │
└────────────────────┬────────────────────────────────────────┘
                     │  Public API (9 methods + 2 getters)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   GameSDK  (composition root)                │
│                                                             │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │SessionManager│  │  GameDataManager  │  │EventManager   │  │
│  │(private)    │  │  (private)        │  │(private)      │  │
│  └─────────────┘  └──────────────────┘  └───────────────┘  │
│                                                             │
│  ┌──────────────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ AchievementManager   │  │  Logger  │  │BridgeAdapter│  │
│  │ (private)            │  │(private) │  │(private)    │  │
│  └──────────────────────┘  └──────────┘  └─────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │  SDKMessageType (JSON envelope)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BridgeAdapter (transport layer)                 │
│                                                             │
│   FlutterBridgeAdapter  │  BrowserBridgeAdapter  │ Fallback │
│   (flutter_inappwebview)│  (postMessage iframe)  │ (no-op)  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        Flutter Game Hub (Wacharlo host)
```

### Key relationships

| Layer | Responsibility |
|-------|---------------|
| Game code | Owns game state, calls SDK methods |
| `GameSDK` | Composes all modules, exposes flat API |
| `SessionManager` | UUID, timestamps, device fingerprint |
| `GameDataManager` | Caches data snapshots, forwards to bridge |
| `EventManager` | Typed pub/sub: host commands → game callbacks |
| `AchievementManager` | Session-scoped unlock tracking |
| `BridgeAdapter` | Environment-specific transport (Flutter / Browser / Fallback) |
| `Logger` | Structured, leveled console output |

---

## Folder Structure

```
wacharlo-game-sdk/
│
├── src/
│   ├── index.ts                  ← Public barrel — import everything from here
│   │
│   ├── sdk/
│   │   ├── GameSDK.ts            ← Composition root, the class games use
│   │   └── IGameSDK.ts           ← Public interface + GameResult type
│   │
│   ├── config/
│   │   └── GameConfig.ts         ← Game identity & feature flag contract
│   │
│   ├── types/
│   │   └── index.ts              ← SDKEventType, SDKGameData, SDKDeviceInfo, SDKSessionMeta
│   │
│   ├── version/
│   │   └── index.ts              ← SDK_VERSION constant
│   │
│   ├── logger/
│   │   └── Logger.ts             ← LogLevel enum + Logger class
│   │
│   ├── bridge/
│   │   ├── IBridgeAdapter.ts     ← Transport contract
│   │   └── BridgeAdapter.ts      ← Abstract base (extend to add new adapters)
│   │
│   ├── events/
│   │   ├── IEventManager.ts      ← Pub/sub contract + EventCallback type
│   │   └── EventManager.ts       ← Typed event bus
│   │
│   ├── session/
│   │   ├── ISessionManager.ts    ← Session lifecycle contract
│   │   └── SessionManager.ts     ← UUID, timestamps, device detection
│   │
│   ├── state/
│   │   ├── IGameDataManager.ts   ← Data reporter contract
│   │   └── GameDataManager.ts    ← Snapshot cache + bridge forwarding
│   │
│   └── achievements/
│       ├── IAchievementManager.ts ← Achievement contract
│       └── AchievementManager.ts  ← Session unlock tracking
│
├── examples/
│   └── README.md                 ← Planned integration examples
│
├── package.json
├── tsconfig.json
├── CHANGELOG.md
└── README.md
```

---

## Public API Reference

### `GameSDK.create(config)` — Static factory

Creates a new SDK instance. Does NOT connect to the host.

```typescript
import { GameSDK, SDKEvent } from '@wacharlo/game-sdk';
import type { GameConfig } from '@wacharlo/game-sdk';

const sdk = GameSDK.create({
  gameSlug: 'rope-rush',          // kebab-case, unique per game
  gameVersion: '1.1.0',           // semver string
  minSDKVersion: '1.1.0',         // minimum compatible SDK version
  supportsLeaderboard: true,
  supportsAchievements: true,
  supportsCloudSave: false,
  supportsXP: false,
  displayName: 'Rope Rush',       // optional, shown in logs
  locale: 'en',                   // optional, locale override (e.g. 'en', 'es')
});
```

**Configuration Parameters (`GameConfig`):**

| Parameter | Type | Required/Optional | Description |
|-----------|------|-------------------|-------------|
| `gameSlug` | `string` | Required | Unique kebab-case identifier (e.g. `'rope-rush'`). |
| `gameVersion` | `string` | Required | Semantic version of the game (e.g. `'3.0.0'`). |
| `minSDKVersion` | `string` | Required | Minimum compatible SDK version (e.g. `'0.1.0'`). |
| `supportsLeaderboard`| `boolean` | Required | Enable/disable leaderboard submission. |
| `supportsAchievements`| `boolean`| Required | Enable/disable achievement unlocks. |
| `supportsCloudSave` | `boolean` | Required | Enable/disable cloud save persistence. |
| `supportsXP` | `boolean` | Required | Enable/disable experience point progress. |
| `displayName` | `string` | Optional | Human-readable name used in UI and log prefixes. Defaults to `gameSlug`. |
| `locale` | `string` | Optional | Language override code (e.g. `'en'`, `'es'`). Falls back to client device language. |

---


### `sdk.initialize()` — Connect to host

Must be called once, before any other method. Auto-detects the host environment.

```typescript
sdk.initialize();
```

**Internally:**
1. Validates `minSDKVersion` compatibility
2. Auto-detects: Flutter WebView → `FlutterBridgeAdapter`, iframe → `BrowserBridgeAdapter`, standalone → `FallbackBridgeAdapter`
3. Sends `INITIALIZE` event to Flutter host with game identity
4. Applies feature flag guards

---

### `sdk.startSession()` — Begin a game run

Call when the player actively starts or restarts a game. Generates a new session UUID each time.

```typescript
playButton.addEventListener('click', () => {
  sdk.startSession();
  game.start();
});
```

---

### `sdk.isInitialized()` — Check SDK readiness

The **only** SDK method safe to call before `initialize()`. Returns `true` once the SDK has initialized successfully.

```typescript
// Guard SDK calls in async contexts:
if (!sdk.isInitialized()) {
  console.warn('SDK not ready');
  return;
}
sdk.report({ score: this.score });

// In a loading screen:
await waitUntil(() => sdk.isInitialized());
sdk.startSession();
```

---

### `sdk.report(data)` — Report game state

Push a partial snapshot of game data to the host. Call this whenever meaningful values change.

**The game owns its data.** This method only communicates it. Never modifies your game values.

```typescript
import type { SDKGameData } from '@wacharlo/game-sdk';

// Score changed:
sdk.report({ score: this.score });

// Multiple fields changed at once:
sdk.report({ score: 450, coins: 12, combo: 3, lives: 2 });
```

**Available fields in `SDKGameData`:**

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number` | Current score |
| `highScore` | `number` | All-time high score |
| `coins` | `number` | Coins collected |
| `gems` | `number` | Gems collected |
| `lives` | `number` | Remaining lives |
| `combo` | `number` | Current combo count |
| `multiplier` | `number` | Score multiplier |
| `timer` | `number` | Elapsed/remaining time (seconds) |
| `level` | `number` | Current level |

> **Do not call `report()` every frame.** Call it only on meaningful state changes. The SDK throttles internally.

---

### `sdk.pause()` — Signal pause

Notify the host that the game is paused. Call after stopping your game loop.

```typescript
sdk.on('REQUEST_PAUSE', () => {
  game.pause();   // Stop your engine first
  sdk.pause();    // Then notify host
});
```

---

### `sdk.resume()` — Signal resume

Notify the host that the game has resumed. Call before restarting your game loop.

```typescript
sdk.on('REQUEST_RESUME', () => {
  sdk.resume();   // Notify host first
  game.resume();  // Then restart your engine
});
```

---

### `sdk.gameOver(result?)` — End session and submit result

End the current session and report the final result. Call when the run is definitively over.

```typescript
import type { GameResult } from '@wacharlo/game-sdk';

// Simple:
sdk.gameOver({ score: 4250 });

// Full result:
sdk.gameOver({
  score: 4250,
  reason: 'player_death',
  data: {
    score: 4250,
    coins: 18,
    combo: 7,
    level: 3,
  }
});
```

**`GameResult` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number?` | Final score (shorthand for `data.score`) |
| `data` | `Partial<SDKGameData>?` | Full data snapshot at end of run |
| `reason` | `string?` | Why the game ended (e.g. `'player_death'`, `'time_expired'`) |

---

### `sdk.unlockAchievement(id)` — Report achievement

Report that the player earned an achievement. Requires `supportsAchievements: true` in config.

```typescript
if (combo >= 10) {
  sdk.unlockAchievement('combo-master-10');
}
```

Achievement IDs must be kebab-case strings agreed upon between the game and the platform.

---

### `sdk.showLeaderboard(payload?)` — Request official host leaderboard UI

Request that the host application display the official WachaPlay leaderboard modal/overlay.

```typescript
leaderboardBtn.addEventListener('click', () => {
  sdk.showLeaderboard();
});
```

**Host Responsibility & SDK Architecture:**
- Games **never** implement or render WachaPlay leaderboard UI themselves.
- The SDK **does not** query Supabase, fetch leaderboard rankings, or render any UI elements.
- The SDK acts strictly as a messenger by dispatching a `SHOW_LEADERBOARD` envelope to the active transport layer (`FlutterWebView`, `Browser`, `Standalone`, or `Mock`).
- The host application receives the event and decides how and when to fetch rankings from Supabase and present the official platform UI.

**Event Schema Envelope:**
```json
{
  "event": "SHOW_LEADERBOARD",
  "type": "SHOW_LEADERBOARD",
  "gameId": "rope-rush",
  "gameVersion": "3.0.0",
  "sdkVersion": "0.1.1-alpha",
  "timestamp": 1784655437494,
  "sessionId": "ffa03b44-6752-4a1c-8d1d-2838db504585",
  "device": { "type": "desktop", "os": "macOS", "language": "en", "pixelRatio": 1 },
  "data": {},
  "payload": {}
}
```

---

### `sdk.on(event, callback)` — Subscribe to host events

Listen for commands and events from the Flutter host.

```typescript
import type { SDKEventType } from '@wacharlo/game-sdk';

// Returns an unsubscribe function:
const off = sdk.on('START_GAME', () => game.start());
const offPause = sdk.on('REQUEST_PAUSE', () => {
  game.pause();
  sdk.pause();
});

// Unsubscribe when done:
off();
offPause();
```

**Subscribable event types:**

| Event | Direction | When it fires |
|-------|-----------|--------------|
| `START_GAME` | Host → Game | Host tells game to begin |
| `RESTART_GAME` | Host → Game | Host tells game to restart |
| `REQUEST_PAUSE` | Host → Game | Host requests game pause |
| `REQUEST_RESUME` | Host → Game | Host requests game resume |
| `LOAD_MINIGAME` | Host → Game | Host loads a specific minigame |
| `GAME_STARTED` | SDK internal | After `startSession()` |
| `GAME_PAUSED` | SDK internal | After `pause()` |
| `GAME_RESUMED` | SDK internal | After `resume()` |
| `GAME_OVER` | SDK internal | After `gameOver()` |
| `DATA_UPDATED` | SDK internal | After `report()` |
| `ACHIEVEMENT_UNLOCKED` | SDK internal | After `unlockAchievement()` |

---

### `sdk.off(event, callback)` — Unsubscribe

Alternative to the cleanup function returned by `on()`. Requires storing the callback reference.

```typescript
const handleStart = () => game.start();
sdk.on('START_GAME', handleStart);

// Later:
sdk.off('START_GAME', handleStart);
```

Prefer the cleanup function pattern — it's simpler and doesn't require storing callback references.

---

### `sdk.dispose()` — Clean shutdown

Shut down the SDK. Call on page unload or when the game component unmounts.

```typescript
window.addEventListener('beforeunload', () => sdk.dispose());
```

Safe to call multiple times.

---

### `sdk.version` — SDK version (getter)

```typescript
console.log(sdk.version); // "0.1.1-alpha"
```

---

### `sdk.config` — Frozen config (getter)

```typescript
console.log(sdk.config.gameSlug);            // "rope-rush"
console.log(sdk.config.supportsLeaderboard); // true
```

---

## Initialization Flow

```
Game bootstrap
     │
     ▼
GameSDK.create(config)         → Instance created, no connection yet
     │
     ▼
sdk.initialize()               → Bridge detected, INITIALIZE sent to host
     │
     ▼
sdk.on('START_GAME', cb)       → Register listeners for host commands
sdk.on('REQUEST_PAUSE', cb)
sdk.on('REQUEST_RESUME', cb)
     │
     ▼
  [Host sends START_GAME]
     │
     ▼
sdk.startSession()             → Session UUID generated, GAME_STARTED sent
```

---

## SDK Lifecycle

See [`SDK_LIFECYCLE.md`](./SDK_LIFECYCLE.md) for the complete lifecycle reference.

```
GameSDK.create(config)           → Instance created (no host connection)
    ↓
sdk.initialize()                 → Bridge detected, INITIALIZE sent to host
    ↓
sdk.on('START_GAME', ...)        → Register event listeners
sdk.on('REQUEST_PAUSE', ...)
    ↓
sdk.startSession()               → Player presses Play → new session UUID
    ↓
sdk.report({ score, coins })     → Meaningful data changes
sdk.pause()  /  sdk.resume()     → Pause / resume signals
sdk.unlockAchievement(id)        → Milestone reached
    ↓
sdk.gameOver({ score, reason })  → Run ends, results submitted
    ↓
sdk.startSession()               → Player restarts (new session UUID)
    ↓
sdk.dispose()                    → Page unloads, idempotent teardown
```

---

## Lifecycle Rules

Every method enforces a clear lifecycle rule. Violations produce `WARN` log messages, never exceptions.

| Method | Rule | Violation behavior |
|--------|------|-------------------|
| `initialize()` | May only succeed once | Logs `WARN: initialize() called more than once — ignoring.` + no-op |
| `startSession()` | Requires `initialize()` first | Logs `WARN: startSession() called before initialize(). Call sdk.initialize() first.` + no-op |
| `startSession()` | If session already active | Logs `WARN: startSession() called while a session is already active. Closing the previous session automatically.` + closes previous silently |
| `report()` | Requires active session | Logs `WARN: report() called with no active session. Call startSession() first.` + no-op |
| `pause()` | Requires active session | Logs `WARN: pause() called with no active session. Call startSession() first.` + no-op |
| `resume()` | Requires active session | Logs `WARN: resume() called with no active session. Call startSession() first.` + no-op |
| `unlockAchievement()` | Requires active session | Logs `WARN: unlockAchievement() called with no active session.` + no-op |
| `unlockAchievement()` | Requires `supportsAchievements: true` | Logs `WARN: unlockAchievement(...) called but config.supportsAchievements is false — ignoring.` + no-op |
| `unlockAchievement()` | Duplicate ID in session | Silently ignored — no duplicate event sent to host |
| `gameOver()` | Requires active session | Logs `WARN: gameOver() called with no active session.` + no-op |
| `gameOver()` | May only be called once per session | Logs `WARN: gameOver() called more than once in the same session — ignoring. A session can only end once.` + no-op |
| `dispose()` | Must be idempotent | Never throws |


---

## Example Integration

> This is documentation only. Implementation happens in Phase 3.

```typescript
import { GameSDK } from '@wacharlo/game-sdk';
import type { SDKGameData, GameResult } from '@wacharlo/game-sdk';

// ── 1. Create SDK instance ──────────────────────────────────────────────────

const sdk = GameSDK.create({
  gameSlug: 'rope-rush',
  gameVersion: '3.0.0',
  minSDKVersion: '0.1.0',
  supportsLeaderboard: true,
  supportsAchievements: false,
  supportsCloudSave: false,
  supportsXP: false,
  displayName: 'Rope Rush',
  locale: 'en',
});

// ── 2. Connect to host ──────────────────────────────────────────────────────

sdk.initialize();

// ── 3. Register event listeners ─────────────────────────────────────────────

sdk.on('START_GAME',    () => game.transitionToPlaying());
sdk.on('RESTART_GAME',  () => game.reset().then(() => game.transitionToPlaying()));
sdk.on('REQUEST_PAUSE', () => {
  game.pause();
  sdk.pause();
});
sdk.on('REQUEST_RESUME', () => {
  sdk.resume();
  game.resume();
});

// ── 4. Start a session when player presses Play ─────────────────────────────

function startGame(): void {
  sdk.startSession();
  game.loop.start();
}

// ── 5. Report data on meaningful changes ───────────────────────────────────────

// Called by the game's score system on every score/coin/life change:
function onScoreChanged(score: number, coins: number, combo: number): void {
  sdk.report({ score, coins, combo });
}

// ── 6. Report achievement unlocks ───────────────────────────────────────────

function onComboReached(combo: number): void {
  if (combo === 10) sdk.unlockAchievement('combo-10');
  if (combo === 25) sdk.unlockAchievement('combo-25');
}

// ── 7. End the session on game over ─────────────────────────────────────────

function onGameOver(finalScore: number): void {
  const result: GameResult = {
    score: finalScore,
    reason: 'player_death',
    data: {
      score: finalScore,
      coins: game.coins,
      combo: game.maxCombo,
      level: game.level,
    },
  };
  sdk.gameOver(result);
}

// ── 8. Clean up on page unload ──────────────────────────────────────────────

window.addEventListener('beforeunload', () => sdk.dispose());
```

---

## Design Principles

### 1. Flat API — No nested managers
```typescript
// ✅ Correct
sdk.report({ score: 100 });
sdk.startSession();
sdk.unlockAchievement('first-run');

// ❌ Wrong — internal managers are not exposed
sdk.session.start();       // Not available
sdk.data.report({ score }); // Not available
sdk.achievements.unlock(); // Not available
```

### 2. Game owns data
```typescript
// ✅ Game calculates score; SDK communicates it
this.score += pointsEarned;
sdk.report({ score: this.score });

// ❌ SDK does not store authoritative score
const score = sdk.someScoreGetter; // Doesn't exist
```

### 3. Return cleanup functions
```typescript
// ✅ Preferred — capture cleanup
const off = sdk.on('REQUEST_PAUSE', handler);
// On destroy:
off();

// ✅ Also valid — explicit off()
sdk.on('REQUEST_PAUSE', handler);
// On destroy:
sdk.off('REQUEST_PAUSE', handler);
```

### 4. Never skip initialize()
```typescript
// ✅ Always call first
sdk.initialize();
sdk.startSession();

// ❌ Calling startSession() without initialize() logs a warning and does nothing
sdk.startSession(); // Warning: "startSession() called before initialize(). Call sdk.initialize() first."
```

### 5. One instance per game
```typescript
// ✅ Create once, use everywhere
export const sdk = GameSDK.create(config);
```

---

## Environment Detection & Transport Layer

The SDK automatically detects the environment and binds the appropriate transport strategy during `initialize()`. Games and hosts never need to manually configure the communication channel.

For detailed design specifications, message lifecycles, and diagnostics telemetry APIs, please see the [Transport Layer Architecture](file:///Users/gerardoarizmendi/Documents/wacharlo-game-sdk/TRANSPORT_ARCHITECTURE.md) document.

```
sdk.initialize()
    │
    ├── Flutter WebView (window.WachaPlayChannel / window.flutter_inappwebview)?
    │       └── FlutterWebViewTransport  (mobile WebView channels)
    │
    ├── Embedded Iframe (window.parent !== window)?
    │       └── BrowserTransport  (iframe postMessage)
    │
    ├── Localhost Development / Testing (localhost, Node environment)?
    │       └── MockTransport  (saves sent messages in-memory, replaces stubs)
    │
    └── Standalone Browser (production / staging direct page access)?
            └── StandaloneTransport  (standalone play mode logs)
```

This detection is completely internal and occurs during the `sdk.initialize()` sequence. Game code interacts only with the public `GameSDK` instance. If your environment changes, the SDK handles the transition transparently.


---

## Developer Best Practices

### Always call `initialize()` first
```typescript
const sdk = GameSDK.create(config);
sdk.initialize();           // ✅ Must come before all other methods
sdk.on('START_GAME', ...);
```

### Register listeners before `startSession()`
```typescript
// ✅ Register first — host may send START_GAME immediately after initialize()
sdk.on('START_GAME', () => game.start());
sdk.on('REQUEST_PAUSE', () => { game.pause(); sdk.pause(); });
```

### Always call `dispose()` on page unload
```typescript
// ✅ Register once during bootstrap:
window.addEventListener('beforeunload', () => sdk.dispose());
```

### Prefer cleanup functions over `off()`
```typescript
// ✅ Simpler pattern:
const off = sdk.on('START_GAME', handler);
// Later:
off();

// ⚠️ Requires storing callback reference:
sdk.on('START_GAME', handler);
// Later:
sdk.off('START_GAME', handler);
```

### Use `isInitialized()` in async/deferred code
```typescript
// ✅ Safe guard in event handlers that might fire before init:
document.addEventListener('visibilitychange', () => {
  if (!sdk.isInitialized()) return;
  if (document.hidden) sdk.pause();
  else sdk.resume();
});
```

### Export one sdk instance per game
```typescript
// game/sdk.ts
export const sdk = GameSDK.create(config);

// Everywhere else:
import { sdk } from './game/sdk';
```

---

## Common Mistakes

### Calling `report()` every frame
```typescript
// ❌ Every frame — too frequent, wastes bridge bandwidth
game.onUpdate(() => sdk.report({ timer: elapsed }));

// ✅ On meaningful change only
game.onScoreChanged(score => sdk.report({ score }));
game.onLifeLost(lives => sdk.report({ lives }));
```

### Skipping `gameOver()` before restart
```typescript
// ❌ Missing gameOver() — session not formally closed
playAgainButton.addEventListener('click', () => {
  sdk.startSession(); // SDK will warn and auto-close, but result is not submitted
});

// ✅ Always close the session first
playAgainButton.addEventListener('click', () => {
  sdk.gameOver({ score: finalScore }); // Submit result
  sdk.startSession();                  // Begin new session
});
```

### Calling `gameOver()` twice
```typescript
// ❌ Duplicate triggers (common with multiple death conditions)
onPlayerDeath(() => sdk.gameOver({ score }));
onTimerExpired(() => sdk.gameOver({ score })); // Second call is ignored with WARN

// ✅ Track game-over state in your game
if (!this.isGameOver) {
  this.isGameOver = true;
  sdk.gameOver({ score: this.score });
}
```

### Choosing an adapter manually
```typescript
// ❌ Never do this — adapter selection is automatic
import { FlutterBridgeAdapter } from '@wacharlo/game-sdk';
new FlutterBridgeAdapter(); // Unnecessary

// ✅ The SDK detects the correct adapter in initialize()
sdk.initialize();
```

---

## FAQ

**Q: Can I call `sdk.on()` before `initialize()`?**  
A: Yes. Event listeners registered before `initialize()` will still receive events once the bridge is connected. Register them early.

**Q: What happens if the Flutter host disconnects?**  
A: The bridge `send()` call fails silently with a `WARN` log. The game continues normally. No exceptions are thrown.

**Q: Can I use the SDK in a game that doesn\'t run inside Flutter?**  
A: Yes. The `FallbackBridgeAdapter` is selected automatically when no Flutter host is detected. All SDK calls succeed; messages are logged to console only.

**Q: How often should I call `report()`?**  
A: Only on meaningful state changes — score increase, coin collected, life lost, level advanced. Never every frame. The SDK throttles internally, but calling it every frame is wasteful.

**Q: What if `gameOver()` is called but the player never pressed Play?**  
A: `gameOver()` requires an active session. If no session is active, it logs a `WARN` and does nothing.

**Q: Can I create multiple SDK instances?**  
A: You can, but you should not. Create one instance per game page load and export it as a singleton. Multiple instances would create multiple bridge connections.

**Q: How do I test the SDK without a Flutter host?**  
A: Run your game in a normal browser. The `FallbackBridgeAdapter` takes over. No configuration needed.

**Q: When should I update `minSDKVersion` in my config?**  
A: Every time you integrate a feature that requires a newer SDK version. If you start using `supportsXP`, update `minSDKVersion` to the version that introduced XP support.

---

## Feature Flags

Feature flags in `GameConfig` control which SDK capabilities are active. The Flutter host reads these flags before the game loads to configure its own UI accordingly.

| Flag | Effect when `true` |
|------|--------------------|
| `supportsLeaderboard` | `gameOver()` triggers leaderboard submission |
| `supportsAchievements` | `unlockAchievement()` sends events (otherwise no-op) |
| `supportsCloudSave` | Session data persisted via Flutter host to Supabase |
| `supportsXP` | `gameOver()` includes XP delta for player progression |

---

## Future Roadmap

### Phase 3 — Rope Rush Migration
- Implement all stub methods in `GameSDK.ts`
- Implement `BridgeAdapter.detect()` environment auto-detection
- Implement `FlutterBridgeAdapter`, `BrowserBridgeAdapter`, `FallbackBridgeAdapter`
- Implement `SessionManager` (UUID, device detection)
- Implement `EventManager` (pub/sub)
- Implement `GameDataManager` (snapshot merge, throttled emit)
- Implement `AchievementManager` (session tracking, duplicate guard)
- Migrate Rope Rush from `WachaBridge` → `GameSDK`

### Phase 4 — Additional Games
- Rocket Lander integration
- Tiny Keeper integration
- Memory Match integration
- Add real-world example to `examples/`

### Phase 5 — Platform Features
- `supportsCloudSave`: cloud save implementation via Flutter host
- `supportsXP`: XP delta in game-over payload
- Leaderboard data retrieval (host → game)
- Achievement definitions fetched from Supabase

### Phase 6 — SDK Hardening
- Re-enable `noUnusedLocals: true` in tsconfig
- Unit test suite for all public methods
- Integration test with mock Flutter host
- Performance profiling (message throughput, bridge latency)
- Public npm publish workflow

---

## Clients

| Game | Status | Notes |
|------|--------|-------|
| `rope-rush` | 🔲 Phase 3 planned | First consumer, reference integration |
| `rocket-lander` | 🔲 Future | — |
| `tiny-keeper` | 🔲 Future | — |
| `memory-match` | 🔲 Future | — |
