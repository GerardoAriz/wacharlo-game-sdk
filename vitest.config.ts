import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Run in Node — no DOM, no browser APIs, no Flutter WebView.
     * The SDK must be safe to test in a pure JS environment.
     */
    environment: 'node',

    /**
     * Test file discovery: any *.test.ts inside tests/
     */
    include: ['tests/**/*.test.ts'],

    /**
     * Human-readable output — shows individual test names on pass/fail.
     */
    reporters: ['verbose'],

    /**
     * Coverage configuration (opt-in via: vitest run --coverage)
     */
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/types/**',
        'src/**/index.ts',
      ],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 60,
        // Functions threshold is intentionally set to 45% for the alpha phase.
        // Logger, EventManager, BridgeAdapter, SessionManager all have stub methods
        // that will be implemented in Phase 3. Raise to 70%+ after implementation.
        functions: 45,
      },
    },
  },
});
