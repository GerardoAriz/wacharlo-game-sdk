# Local Development Guide — `@wacharlo/game-sdk`

This guide explains how to consume the Wacharlo Game SDK locally in any HTML5 game
project **before** it is published to an npm registry.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | ≥ 18    |
| npm         | ≥ 9     |
| TypeScript  | ≥ 5.4   |

---

## Project Structure

```
wacharlo-game-sdk/        ← this package
  src/                    ← TypeScript source (authoritative)
  dist/                   ← Compiled JS + .d.ts (produced by npm run build)
  tsconfig.json           ← Dev typecheck (noEmit: true)
  tsconfig.build.json     ← Build config  (emits to dist/)
  package.json
```

---

## Method 1 — `npm link` (Recommended for active development)

Use this when you are **actively editing the SDK** and want the game to always use
the latest source without re-packing.

### In the SDK project

```bash
cd /path/to/wacharlo-game-sdk

# 1. Build the SDK (required once, and after each change)
npm install
npm run build

# 2. Register a global symlink
npm link
```

### In the game project (e.g. rope-rush-phase3)

```bash
cd /path/to/rope-rush-phase3

# 3. Link the globally-registered package into this project
npm link @wacharlo/game-sdk
```

### Use in game code

```ts
import { GameSDK } from '@wacharlo/game-sdk';
import type { GameConfig } from '@wacharlo/game-sdk';
```

### Rebuild on SDK changes

Whenever you modify SDK source files:

```bash
# In the SDK project
npm run build        # incremental build
# OR
npm run build:clean  # full clean rebuild
```

The linked game project picks up the new `dist/` output immediately — no re-link
needed.

### Remove the link

```bash
# In the game project
npm unlink @wacharlo/game-sdk

# In the SDK project (removes global symlink)
npm unlink
```

---

## Method 2 — `npm pack` (Recommended for integration testing)

Use this when you want to test the **exact artifact that would be published** to
an npm registry. This catches any issues with the `files` field or missing
declarations before publishing.

### Pack the tarball

```bash
cd /path/to/wacharlo-game-sdk

npm install
npm run build:clean          # always clean-build before packing
npm pack                     # produces: wacharlo-game-sdk-0.1.1-alpha.tgz
```

### Inspect what will be packed (dry run)

```bash
npm run pack:dry
```

### Install the tarball in a game project

```bash
cd /path/to/rope-rush-phase3

npm install /path/to/wacharlo-game-sdk/wacharlo-game-sdk-0.1.1-alpha.tgz
```

This installs it exactly as if it came from a registry, including the `exports`
map and declaration files.

### Re-install after SDK changes

```bash
# Rebuild and re-pack in the SDK project
npm run build:clean && npm pack

# Re-install in the game project
npm install /path/to/wacharlo-game-sdk/wacharlo-game-sdk-0.1.1-alpha.tgz
```

---

## Method 3 — Direct path install via `package.json` (Quick integration)

For a simple local dependency without symlinking or tarballs:

```bash
cd /path/to/rope-rush-phase3

npm install ../wacharlo-game-sdk
```

> [!WARNING]
> Path installs do **not** honour the `exports` field the same way a registry
> install does. If the game uses a bundler (Vite, Webpack), this usually works
> fine. For strict ESM environments, prefer Method 1 or 2.

---

## Method 4 — npm / GitHub Packages registry (Future / Production)

When the SDK is ready for production distribution:

### Publish to npm

```bash
cd /path/to/wacharlo-game-sdk

# Bump version in package.json + SDK_VERSION constant first, then:
npm publish --access restricted
```

### Publish to GitHub Packages (scoped to @wacharlo)

```bash
# .npmrc in the SDK project:
@wacharlo:registry=https://npm.pkg.github.com

npm publish
```

### Consume from registry

```bash
npm install @wacharlo/game-sdk
```

```json
// package.json of the game project
{
  "dependencies": {
    "@wacharlo/game-sdk": "^0.1.1-alpha"
  }
}
```

---

## TypeScript Configuration for Consumers

The game's `tsconfig.json` does not need special configuration. The SDK ships
declaration files (`.d.ts`) alongside the JS output in `dist/`. TypeScript
discovers them automatically via the `types` field in `package.json`.

Minimal consumer `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

---

## Vite Configuration for Consumers

If the game uses Vite, `npm link` packages may need to be explicitly optimised:

```ts
// vite.config.ts of the game project
export default {
  optimizeDeps: {
    include: ['@wacharlo/game-sdk'],
  },
};
```

---

## Versioning Contract

| SDK Version  | Status       | Notes                           |
|--------------|--------------|---------------------------------|
| `0.1.x-alpha`| In development| API may change without notice  |
| `0.2.x-beta` | Stabilising  | Deprecation warnings added      |
| `1.0.0`      | Stable       | SemVer guarantees apply         |

When consuming an alpha build, always pin the exact version:

```json
"@wacharlo/game-sdk": "0.1.1-alpha"
```

---

## Quick Reference

| Task                     | Command (in SDK dir)                          |
|--------------------------|-----------------------------------------------|
| Typecheck only           | `npm run typecheck`                           |
| Build for consumption    | `npm run build`                               |
| Clean rebuild            | `npm run build:clean`                         |
| Register global symlink  | `npm link`                                    |
| Preview pack contents    | `npm run pack:dry`                            |
| Create tarball           | `npm pack`                                    |
| Publish (future)         | `npm publish --access restricted`             |
