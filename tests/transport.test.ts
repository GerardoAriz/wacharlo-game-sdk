import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameSDK } from '../src/sdk/GameSDK';
import { detectTransport } from '../src/transport/detect';
import { FlutterWebViewTransport } from '../src/transport/FlutterWebViewTransport';
import { BrowserTransport } from '../src/transport/BrowserTransport';
import { StandaloneTransport } from '../src/transport/StandaloneTransport';
import { MockTransport } from '../src/transport/MockTransport';
import { Logger } from '../src/logger/Logger';
import type { GameConfig, SDKMessageType } from '../src/types/index';

const BASE_CONFIG: GameConfig = {
  gameSlug: 'test-game',
  gameVersion: '1.0.0',
  minSDKVersion: '0.1.0',
  supportsLeaderboard: true,
  supportsAchievements: true,
  supportsCloudSave: false,
  supportsXP: false,
};

describe('Transport Detection & Functionality', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'info').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = originalWindow;
  });

  describe('detectTransport() runtime priority detection', () => {
    it('detects MockTransport when window is undefined (e.g. Node/SSR/Vitest)', () => {
      (globalThis as any).window = undefined;
      const transport = detectTransport();
      expect(transport).toBeInstanceOf(MockTransport);
    });

    it('detects FlutterWebViewTransport when window.WachaPlayChannel is defined', () => {
      const mockWindow = {
        WachaPlayChannel: { postMessage: () => {} },
      };
      (globalThis as any).window = mockWindow as any;
      const transport = detectTransport();
      expect(transport).toBeInstanceOf(FlutterWebViewTransport);
    });

    it('detects FlutterWebViewTransport when window.flutter_inappwebview is defined', () => {
      const mockWindow = {
        flutter_inappwebview: { callHandler: () => {} },
      };
      (globalThis as any).window = mockWindow as any;
      const transport = detectTransport();
      expect(transport).toBeInstanceOf(FlutterWebViewTransport);
    });

    it('detects BrowserTransport when window.parent !== window', () => {
      const mockWindow = {
        parent: {}, // parent exists and is different
      };
      // circular ref to simulate normal window
      (mockWindow as any).window = mockWindow;
      (globalThis as any).window = mockWindow as any;
      const transport = detectTransport();
      expect(transport).toBeInstanceOf(BrowserTransport);
    });

    it('detects MockTransport on localhost / 127.0.0.1 / *.local', () => {
      const mockWindow = {
        parent: undefined,
        location: { hostname: 'localhost' },
      };
      (mockWindow as any).window = mockWindow;
      (globalThis as any).window = mockWindow as any;
      const transport = detectTransport();
      expect(transport).toBeInstanceOf(MockTransport);
    });

    it('detects StandaloneTransport in production/staging standalone mode', () => {
      const mockWindow = {
        parent: undefined,
        location: { hostname: 'wacha.play.game.com' },
      };
      (mockWindow as any).window = mockWindow;
      (globalThis as any).window = mockWindow as any;
      (mockWindow as any).parent = mockWindow; // parent === window
      const transport = detectTransport();
      expect(transport).toBeInstanceOf(StandaloneTransport);
    });
  });

  describe('FlutterWebViewTransport functionality', () => {
    it('initializes and registers window.receiveWachaPlayMessage', () => {
      const mockWindow = {
        WachaPlayChannel: { postMessage: vi.fn() },
      };
      (globalThis as any).window = mockWindow as any;
      const transport = new FlutterWebViewTransport();
      transport.initialize();

      expect((mockWindow as any).receiveWachaPlayMessage).toBeDefined();

      const receivedMsg: SDKMessageType = {
        event: 'START_GAME',
        type: 'START_GAME',
        gameId: 'test',
        gameVersion: '1.0',
        sdkVersion: '0.1.0',
        timestamp: Date.now(),
        sessionId: '123',
        device: { type: 'desktop', os: 'Unknown', language: 'en', pixelRatio: 1 },
        data: {},
      };

      const handler = vi.fn();
      transport.setMessageHandler(handler);

      // Simulate incoming message from Flutter
      (mockWindow as any).receiveWachaPlayMessage(JSON.stringify(receivedMsg));
      expect(handler).toHaveBeenCalledWith(receivedMsg);

      transport.destroy();
      expect((mockWindow as any).receiveWachaPlayMessage).toBeUndefined();
    });

    it('sends via WachaPlayChannel postMessage', () => {
      const postMessageSpy = vi.fn();
      const mockWindow = {
        WachaPlayChannel: { postMessage: postMessageSpy },
      };
      (globalThis as any).window = mockWindow as any;
      const transport = new FlutterWebViewTransport();
      transport.initialize();

      const msg: SDKMessageType = {
        event: 'GAME_STARTED',
        type: 'GAME_STARTED',
        gameId: 'test',
        gameVersion: '1.0',
        sdkVersion: '0.1.0',
        timestamp: Date.now(),
        sessionId: '123',
        device: { type: 'desktop', os: 'Unknown', language: 'en', pixelRatio: 1 },
        data: {},
      };

      transport.send(msg);
      expect(postMessageSpy).toHaveBeenCalledWith(JSON.stringify(msg));
    });

    it('sends via flutter_inappwebview callHandler when channel is absent', () => {
      const callHandlerSpy = vi.fn();
      const mockWindow = {
        flutter_inappwebview: { callHandler: callHandlerSpy },
      };
      (globalThis as any).window = mockWindow as any;
      const transport = new FlutterWebViewTransport();
      transport.initialize();

      const msg: SDKMessageType = {
        event: 'GAME_STARTED',
        type: 'GAME_STARTED',
        gameId: 'test',
        gameVersion: '1.0',
        sdkVersion: '0.1.0',
        timestamp: Date.now(),
        sessionId: '123',
        device: { type: 'desktop', os: 'Unknown', language: 'en', pixelRatio: 1 },
        data: {},
      };

      transport.send(msg);
      expect(callHandlerSpy).toHaveBeenCalledWith('WachaPlayChannel', JSON.stringify(msg));
    });
  });

  describe('BrowserTransport functionality', () => {
    it('sends via window.parent.postMessage', () => {
      const postMessageSpy = vi.fn();
      const mockWindow = {
        parent: { postMessage: postMessageSpy },
      };
      (mockWindow as any).window = mockWindow;
      (globalThis as any).window = mockWindow as any;

      const transport = new BrowserTransport();
      transport.initialize();

      const msg: SDKMessageType = {
        event: 'GAME_STARTED',
        type: 'GAME_STARTED',
        gameId: 'test',
        gameVersion: '1.0',
        sdkVersion: '0.1.0',
        timestamp: Date.now(),
        sessionId: '123',
        device: { type: 'desktop', os: 'Unknown', language: 'en', pixelRatio: 1 },
        data: {},
      };

      transport.send(msg);
      expect(postMessageSpy).toHaveBeenCalledWith(msg, '*');
    });
  });

  describe('MockTransport functionality', () => {
    it('holds sent messages and triggers receiving', () => {
      const transport = new MockTransport();
      transport.initialize();

      const msg: SDKMessageType = {
        event: 'INITIALIZE',
        type: 'INITIALIZE',
        gameId: 'test',
        gameVersion: '1.0',
        sdkVersion: '0.1.0',
        timestamp: Date.now(),
        sessionId: '',
        device: { type: 'desktop', os: 'Unknown', language: 'en', pixelRatio: 1 },
        data: {},
      };

      transport.send(msg);
      expect(transport.sentMessages).toHaveLength(1);
      expect(transport.sentMessages[0]).toEqual(msg);

      const handler = vi.fn();
      transport.setMessageHandler(handler);

      transport.mockReceive(msg);
      expect(handler).toHaveBeenCalledWith(msg);
    });
  });

  describe('SHOW_LEADERBOARD transport verification across all environments', () => {
    it('transports SHOW_LEADERBOARD via FlutterWebViewTransport (WachaPlayChannel)', () => {
      const postMessageSpy = vi.fn();
      const mockWindow = { WachaPlayChannel: { postMessage: postMessageSpy } };
      (globalThis as any).window = mockWindow as any;

      const sdk = GameSDK.create(BASE_CONFIG);
      sdk.initialize();
      postMessageSpy.mockClear();

      sdk.showLeaderboard();

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(postMessageSpy.mock.calls[0][0]);
      expect(parsed.event).toBe('SHOW_LEADERBOARD');
      expect(parsed.gameId).toBe('test-game');
      expect(parsed.payload).toEqual({});
    });

    it('transports SHOW_LEADERBOARD via FlutterWebViewTransport (flutter_inappwebview fallback)', () => {
      const callHandlerSpy = vi.fn();
      const mockWindow = { flutter_inappwebview: { callHandler: callHandlerSpy } };
      (globalThis as any).window = mockWindow as any;

      const sdk = GameSDK.create(BASE_CONFIG);
      sdk.initialize();
      callHandlerSpy.mockClear();

      sdk.showLeaderboard();

      expect(callHandlerSpy).toHaveBeenCalledTimes(1);
      expect(callHandlerSpy.mock.calls[0][0]).toBe('WachaPlayChannel');
      const parsed = JSON.parse(callHandlerSpy.mock.calls[0][1]);
      expect(parsed.event).toBe('SHOW_LEADERBOARD');
    });

    it('transports SHOW_LEADERBOARD via BrowserTransport (window.parent.postMessage)', () => {
      const postMessageSpy = vi.fn();
      const mockWindow = { parent: { postMessage: postMessageSpy } };
      (mockWindow as any).window = mockWindow;
      (globalThis as any).window = mockWindow as any;

      const sdk = GameSDK.create(BASE_CONFIG);
      sdk.initialize();
      postMessageSpy.mockClear();

      sdk.showLeaderboard();

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      expect(postMessageSpy.mock.calls[0][0].event).toBe('SHOW_LEADERBOARD');
      expect(postMessageSpy.mock.calls[0][1]).toBe('*');
    });

    it('transports SHOW_LEADERBOARD via StandaloneTransport without errors', () => {
      const mockWindow = { parent: undefined, location: { hostname: 'wacha.play.game.com' } };
      (mockWindow as any).window = mockWindow;
      (mockWindow as any).parent = mockWindow;
      (globalThis as any).window = mockWindow as any;

      const sdk = GameSDK.create(BASE_CONFIG);
      sdk.initialize();

      expect(() => sdk.showLeaderboard()).not.toThrow();
      expect(sdk.getDiagnostics().messagesSent).toBeGreaterThan(0);
    });

    it('transports SHOW_LEADERBOARD via MockTransport into sentMessages', () => {
      const mockTransport = new MockTransport();
      const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
      sdk.initialize();
      mockTransport.sentMessages = [];

      sdk.showLeaderboard();

      expect(mockTransport.sentMessages).toHaveLength(1);
      expect(mockTransport.sentMessages[0].event).toBe('SHOW_LEADERBOARD');
    });
  });

  describe('GameSDK Integration Throttling & Diagnostics', () => {
    it('throttles multiple report() calls', async () => {
      vi.useFakeTimers();
      const mockTransport = new MockTransport();
      const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
      sdk.initialize();
      sdk.startSession();

      // Clear the session started message
      mockTransport.sentMessages = [];

      sdk.report({ score: 10 });
      sdk.report({ score: 20 });
      sdk.report({ score: 30 });

      // First call was sent immediately because lastReportTime = 0
      // Subsequent calls are queued under the throttle window
      expect(mockTransport.sentMessages).toHaveLength(1);
      expect(mockTransport.sentMessages[0].event).toBe('DATA_UPDATED');
      expect(mockTransport.sentMessages[0].data.score).toBe(10);

      // Fast-forward 100ms
      vi.advanceTimersByTime(100);

      // The queued reports should be flushed (merging score: 30)
      expect(mockTransport.sentMessages).toHaveLength(2);
      expect(mockTransport.sentMessages[1].data.score).toBe(30);

      vi.useRealTimers();
    });

    it('flushes pending throttled data immediately on gameOver()', () => {
      vi.useFakeTimers();
      const mockTransport = new MockTransport();
      const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
      sdk.initialize();
      sdk.startSession();

      mockTransport.sentMessages = [];

      // Report some data (sends immediately because lastReportTime = 0)
      sdk.report({ score: 100 });
      expect(mockTransport.sentMessages).toHaveLength(1);

      // Report a second value (should be throttled / queued)
      sdk.report({ score: 120 });
      expect(mockTransport.sentMessages).toHaveLength(1);

      // Call gameOver (should flush the score 120 immediately before the game over message)
      sdk.gameOver({ score: 150 });

      expect(mockTransport.sentMessages).toHaveLength(3);
      expect(mockTransport.sentMessages[1].event).toBe('DATA_UPDATED');
      expect(mockTransport.sentMessages[1].data.score).toBe(120);

      expect(mockTransport.sentMessages[2].event).toBe('GAME_OVER');
      expect(mockTransport.sentMessages[2].data.score).toBe(150);

      vi.useRealTimers();
    });

    it('reports accurate diagnostic telemetry via sdk.getDiagnostics()', () => {
      const mockTransport = new MockTransport();
      const sdk = GameSDK.create(BASE_CONFIG, { transport: mockTransport });
      sdk.initialize();
      sdk.startSession();

      sdk.report({ score: 100 });

      const diagnostics = sdk.getDiagnostics();
      expect(diagnostics.activeTransport).toBe('MockTransport');
      expect(diagnostics.deliveryMethod).toBe('mock');
      expect(diagnostics.messagesSent).toBeGreaterThan(0);
      expect(diagnostics.lastMessage).not.toBeNull();
      expect(diagnostics.lastMessage?.event).toBe('DATA_UPDATED');
      expect(diagnostics.transportInitializationTime).toBeGreaterThan(0);
    });
  });
});
