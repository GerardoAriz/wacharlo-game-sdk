# Examples

This directory will contain reference implementations showing how HTML5 games integrate with `@wacharlo/game-sdk`.

## Planned Examples

| Example | Description | Status |
|---------|-------------|--------|
| `basic-game/` | Minimal SDK integration — initialize, session, data reporting | 🔲 Planned |
| `leaderboard/` | How to enable and use the leaderboard flow | 🔲 Planned |
| `achievements/` | Unlocking achievements at game events | 🔲 Planned |
| `cloud-save/` | Persisting game progress via the Flutter host | 🔲 Planned |
| `multi-minigame/` | Hub game with multiple minigames, each reporting independently | 🔲 Planned |

## How to Use Examples

Each example will be a self-contained Vite + TypeScript project that:

1. Imports `@wacharlo/game-sdk` via path alias
2. Demonstrates one specific integration pattern
3. Includes a `README.md` explaining the pattern

## First Consumer

**rope-rush-phase3** will be the first real-world consumer of this SDK.
When its migration begins, it will serve as the reference for all future games.
