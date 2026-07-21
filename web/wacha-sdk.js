/* @wacharlo/game-sdk v0.1.1-alpha - Built on 2026-07-21T17:21:52.089525Z */
"use strict";
(() => {
  // src/logger/Logger.ts
  var sdkGlobalLogLevel = null;
  function getEnvironmentDefaultLevel() {
    let isDev = true;
    try {
      const globalProcess = globalThis.process;
      if (globalProcess && globalProcess.env && globalProcess.env.NODE_ENV === "production") {
        isDev = false;
      }
    } catch (e) {
    }
    return isDev ? 0 /* DEBUG */ : 2 /* WARN */;
  }
  var Logger = class {
    prefix;
    minLevel = null;
    // null means fall back to environment default or global override
    constructor(module, minLevel) {
      this.prefix = `[WachaSDK:${module}]`;
      if (minLevel !== void 0) {
        this.minLevel = minLevel;
      }
    }
    getEffectiveLogLevel() {
      if (sdkGlobalLogLevel !== null) {
        return sdkGlobalLogLevel;
      }
      if (this.minLevel !== null) {
        return this.minLevel;
      }
      return getEnvironmentDefaultLevel();
    }
    /**
     * Sets a global log level override for all logger instances.
     */
    static setGlobalLevel(level) {
      sdkGlobalLogLevel = level;
    }
    /**
     * Resets the global log level override.
     */
    static resetGlobalLevel() {
      sdkGlobalLogLevel = null;
    }
    /**
     * Silences all output from this logger instance.
     */
    mute() {
      this.minLevel = 4 /* SILENT */;
    }
    /**
     * Restores output to the environment default.
     */
    unmute() {
      this.minLevel = null;
    }
    /**
     * Sets the minimum log level for this logger instance.
     */
    setLevel(level) {
      this.minLevel = level;
    }
    debug(message, ...args) {
      if (this.getEffectiveLogLevel() <= 0 /* DEBUG */) {
        console.debug(this.prefix, message, ...args);
      }
    }
    info(message, ...args) {
      if (this.getEffectiveLogLevel() <= 1 /* INFO */) {
        console.log(this.prefix, message, ...args);
      }
    }
    warn(message, ...args) {
      if (this.getEffectiveLogLevel() <= 2 /* WARN */) {
        console.warn(this.prefix, message, ...args);
      }
    }
    error(message, ...args) {
      if (this.getEffectiveLogLevel() <= 3 /* ERROR */) {
        console.error(this.prefix, message, ...args);
      }
    }
  };

  // src/session/SessionManager.ts
  var SessionManager = class {
    logger = new Logger("SessionManager");
    sessionId = null;
    startedAt = null;
    endedAt = null;
    device = null;
    active = false;
    _sessionSource = "none";
    _sessionOrigin = "none";
    start(hostSessionId, origin) {
      if (this.active) {
        this.logger.warn("Session already active \u2014 ignoring duplicate start.");
        return;
      }
      if (hostSessionId && typeof hostSessionId === "string" && hostSessionId.trim() !== "") {
        this.sessionId = hostSessionId.trim();
        this._sessionSource = "host";
        this._sessionOrigin = origin ?? "manual";
        this.logger.info("Session started with host-provided ID", {
          sessionId: this.sessionId,
          source: "host",
          origin: this._sessionOrigin
        });
      } else {
        this.sessionId = this.generateUUID();
        this._sessionSource = "local";
        this._sessionOrigin = "generated";
        this.logger.info("Session started with locally-generated ID", {
          sessionId: this.sessionId,
          source: "local",
          origin: "generated"
        });
      }
      this.device = this.detectDevice();
      this.startedAt = Date.now();
      this.endedAt = null;
      this.active = true;
    }
    end() {
      if (!this.active) {
        this.logger.warn("No active session to end.");
        return;
      }
      this.endedAt = Date.now();
      this.active = false;
      const duration = this.startedAt ? (this.endedAt - this.startedAt) / 1e3 : 0;
      this.logger.info(`Session ended. Duration: ${duration.toFixed(2)}s`, {
        sessionId: this.sessionId,
        source: this._sessionSource,
        origin: this._sessionOrigin
      });
    }
    getId() {
      return this.sessionId;
    }
    isActive() {
      return this.active;
    }
    getMeta() {
      if (!this.sessionId || !this.startedAt || !this.device) {
        return null;
      }
      const elapsed = this.getElapsedSeconds();
      return {
        sessionId: this.sessionId,
        startedAt: this.startedAt,
        endedAt: this.endedAt || void 0,
        durationSeconds: elapsed,
        device: this.device
      };
    }
    getElapsedSeconds() {
      if (!this.startedAt) {
        return 0;
      }
      const end = this.endedAt || Date.now();
      return (end - this.startedAt) / 1e3;
    }
    getSessionSource() {
      return this._sessionSource;
    }
    getSessionOrigin() {
      return this._sessionOrigin;
    }
    generateUUID() {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    }
    detectDevice() {
      if (typeof window === "undefined" || typeof navigator === "undefined") {
        return {
          type: "desktop",
          os: "Unknown",
          language: "en",
          pixelRatio: 1
        };
      }
      const ua = navigator.userAgent || "";
      let type = "desktop";
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        type = "tablet";
      } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
        type = "mobile";
      }
      let os = "Unknown";
      if (/Windows/i.test(ua)) os = "Windows";
      else if (/Macintosh/i.test(ua)) os = "macOS";
      else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
      else if (/Android/i.test(ua)) os = "Android";
      else if (/Linux/i.test(ua)) os = "Linux";
      return {
        type,
        os,
        language: navigator.language || "en",
        pixelRatio: window.devicePixelRatio || 1
      };
    }
  };

  // src/state/GameDataManager.ts
  var GameDataManager = class {
    logger = new Logger("GameDataManager");
    snapshot = null;
    report(data) {
      this.snapshot = {
        ...this.snapshot,
        ...data
      };
      this.logger.debug("Game data reported", data);
    }
    getLastSnapshot() {
      return this.snapshot ? Object.freeze({ ...this.snapshot }) : null;
    }
    reset() {
      this.snapshot = null;
      this.logger.info("Game data snapshot reset.");
    }
  };

  // src/events/EventManager.ts
  var EventManager = class {
    logger = new Logger("EventManager");
    listeners = /* @__PURE__ */ new Map();
    /**
     * Subscribes to an SDK event. Returns a cleanup function.
     */
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, /* @__PURE__ */ new Set());
      }
      this.listeners.get(event).add(callback);
      return () => {
        this.off(event, callback);
      };
    }
    /**
     * Unsubscribes a specific callback from an event.
     */
    off(event, callback) {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    }
    /**
     * Emits an event to all registered subscribers.
     */
    emit(event, payload) {
      const set = this.listeners.get(event);
      this.logger.debug(`Emitting event: ${event}`, payload);
      if (set) {
        const callbacks = Array.from(set);
        for (const cb of callbacks) {
          try {
            cb(payload);
          } catch (e) {
            this.logger.error(`Error in event callback for event ${event}`, e);
          }
        }
      }
    }
    /**
     * Clears all subscribers for all events.
     */
    clear() {
      this.listeners.clear();
      this.logger.info("All event listeners cleared.");
    }
  };

  // src/achievements/AchievementManager.ts
  var AchievementManager = class {
    constructor(events) {
      this.events = events;
    }
    events;
    logger = new Logger("AchievementManager");
    sessionUnlocks = [];
    unlock(achievementId) {
      if (this.sessionUnlocks.includes(achievementId)) {
        this.logger.warn(`Achievement "${achievementId}" was already unlocked this session \u2014 ignoring duplicate.`);
        return;
      }
      this.sessionUnlocks.push(achievementId);
      this.logger.info(`Achievement unlocked: ${achievementId}`);
      if (this.events) {
        this.events.emit("ACHIEVEMENT_UNLOCKED", { achievementId });
      }
    }
    getSessionUnlocks() {
      return [...this.sessionUnlocks];
    }
    reset() {
      this.sessionUnlocks = [];
      this.logger.info("Achievement session list reset.");
    }
  };

  // src/version/index.ts
  var SDK_VERSION = "0.1.1-alpha";

  // src/transport/Transport.ts
  var Transport = class {
    logger;
    onMessageReceived;
    messagesSentCount = 0;
    messagesReceivedCount = 0;
    lastSentMessage = null;
    lastError = null;
    lastFailure = null;
    initTime;
    constructor() {
      this.logger = new Logger(this.constructor.name);
      this.initTime = Date.now();
    }
    /**
     * Registers a message listener for messages coming from the host.
     */
    setMessageHandler(handler) {
      this.onMessageReceived = handler;
    }
    /**
     * Returns a copy of transport-specific diagnostics.
     */
    getDiagnostics(sdkVersion) {
      return {
        activeTransport: this.constructor.name,
        hostDetected: this.isHostDetected(),
        deliveryMethod: this.getDeliveryMethod(),
        sdkVersion,
        messagesSent: this.messagesSentCount,
        messagesReceived: this.messagesReceivedCount,
        pendingMessages: this.getPendingMessagesCount(),
        lastMessage: this.lastSentMessage,
        lastError: this.lastError,
        lastTransportFailure: this.lastFailure,
        transportInitializationTime: this.initTime,
        // Session fields are populated by GameSDK.getDiagnostics() which has
        // access to SessionManager. Defaults here are used if the transport
        // diagnostics are accessed directly (e.g. in tests or advanced adapters).
        sessionId: null,
        sessionSource: "none",
        sessionOrigin: "none",
        transport: this.constructor.name
      };
    }
    /**
     * Subclasses can report any pending unsent/unacknowledged messages.
     */
    getPendingMessagesCount() {
      return 0;
    }
  };

  // src/transport/FlutterWebViewTransport.ts
  var FlutterWebViewTransport = class extends Transport {
    initialize() {
      if (typeof window === "undefined") return;
      window.receiveWachaPlayMessage = (message) => {
        this.messagesReceivedCount++;
        this.logger.debug("Received message from Flutter host", message);
        if (this.onMessageReceived) {
          try {
            const parsed = typeof message === "string" ? JSON.parse(message) : message;
            this.onMessageReceived(parsed);
          } catch (e) {
            this.lastError = e instanceof Error ? e.message : String(e);
            this.logger.error("Failed to parse incoming message from Flutter", e);
          }
        }
      };
      this.logger.info("FlutterWebViewTransport initialized successfully.");
    }
    send(message) {
      if (typeof window === "undefined") return;
      this.messagesSentCount++;
      this.lastSentMessage = message;
      const messageStr = JSON.stringify(message);
      const wachaChannel = window.WachaPlayChannel;
      if (wachaChannel && typeof wachaChannel.postMessage === "function") {
        try {
          wachaChannel.postMessage(messageStr);
          this.logger.debug("Sent message to Flutter via WachaPlayChannel", message);
        } catch (e) {
          this.lastError = e instanceof Error ? e.message : String(e);
          this.lastFailure = "WachaPlayChannel_failed";
          this.logger.error("Failed to send via WachaPlayChannel", e);
        }
      } else {
        const inAppWebView = window.flutter_inappwebview;
        if (inAppWebView && typeof inAppWebView.callHandler === "function") {
          try {
            inAppWebView.callHandler("WachaPlayChannel", messageStr);
            this.logger.debug("Sent message to Flutter via flutter_inappwebview", message);
          } catch (e) {
            this.lastError = e instanceof Error ? e.message : String(e);
            this.lastFailure = "flutter_inappwebview_failed";
            this.logger.error("Failed to send via flutter_inappwebview", e);
          }
        } else {
          this.lastError = "Neither WachaPlayChannel nor flutter_inappwebview is available on window";
          this.lastFailure = "no_flutter_channel";
          this.logger.warn("Flutter WebView transport failed: no host channels available on window.");
        }
      }
    }
    destroy() {
      if (typeof window !== "undefined") {
        try {
          delete window.receiveWachaPlayMessage;
        } catch (e) {
          window.receiveWachaPlayMessage = void 0;
        }
      }
      this.logger.info("FlutterWebViewTransport destroyed.");
    }
    isHostDetected() {
      if (typeof window === "undefined") return false;
      return !!(window.WachaPlayChannel || window.flutter_inappwebview);
    }
    getDeliveryMethod() {
      if (typeof window === "undefined") return "none";
      if (window.WachaPlayChannel) return "window.WachaPlayChannel";
      if (window.flutter_inappwebview) return "window.flutter_inappwebview";
      return "none";
    }
  };

  // src/transport/BrowserTransport.ts
  var BrowserTransport = class extends Transport {
    messageListener = null;
    initialize() {
      if (typeof window === "undefined") return;
      this.messageListener = (event) => {
        const data = event.data;
        if (data && (data.event || data.type)) {
          this.messagesReceivedCount++;
          this.logger.debug("Received message from parent window via postMessage", data);
          if (this.onMessageReceived) {
            this.onMessageReceived(data);
          }
        }
      };
      if (typeof window.addEventListener === "function") {
        window.addEventListener("message", this.messageListener);
      }
      this.logger.info("BrowserTransport initialized successfully (iframe mode).");
    }
    send(message) {
      if (typeof window === "undefined") return;
      this.messagesSentCount++;
      this.lastSentMessage = message;
      try {
        window.parent.postMessage(message, "*");
        this.logger.debug("Sent message to parent window", message);
      } catch (e) {
        this.lastError = e instanceof Error ? e.message : String(e);
        this.lastFailure = "postMessage_failed";
        this.logger.error("Failed to dispatch postMessage to parent window", e);
      }
    }
    destroy() {
      if (typeof window !== "undefined" && this.messageListener) {
        if (typeof window.removeEventListener === "function") {
          window.removeEventListener("message", this.messageListener);
        }
        this.messageListener = null;
      }
      this.logger.info("BrowserTransport destroyed.");
    }
    isHostDetected() {
      if (typeof window === "undefined") return false;
      return window.parent !== window;
    }
    getDeliveryMethod() {
      return "window.parent.postMessage";
    }
  };

  // src/transport/StandaloneTransport.ts
  var StandaloneTransport = class extends Transport {
    initialize() {
      this.logger.info("StandaloneTransport initialized (standalone browser mode).");
    }
    send(message) {
      this.messagesSentCount++;
      this.lastSentMessage = message;
      this.logger.info(`[StandaloneTransport] Sent Event: ${message.event}`, message);
    }
    destroy() {
      this.logger.info("StandaloneTransport destroyed.");
    }
    isHostDetected() {
      return false;
    }
    getDeliveryMethod() {
      return "console";
    }
  };

  // src/transport/MockTransport.ts
  var MockTransport = class extends Transport {
    sentMessages = [];
    initialize() {
      this.logger.info("MockTransport initialized.");
    }
    send(message) {
      this.messagesSentCount++;
      this.lastSentMessage = message;
      this.sentMessages.push(message);
      this.logger.debug("MockTransport sent message", message);
    }
    /**
     * Test/Mock method to simulate receiving a message from the host.
     */
    mockReceive(message) {
      this.messagesReceivedCount++;
      if (this.onMessageReceived) {
        this.onMessageReceived(message);
      }
    }
    destroy() {
      this.sentMessages = [];
      this.logger.info("MockTransport destroyed.");
    }
    isHostDetected() {
      return false;
    }
    getDeliveryMethod() {
      return "mock";
    }
  };

  // src/transport/detect.ts
  function detectTransport() {
    if (typeof window === "undefined") {
      return new MockTransport();
    }
    const isFlutter = !!(window.WachaPlayChannel || window.flutter_inappwebview);
    if (isFlutter) {
      return new FlutterWebViewTransport();
    }
    const isEmbedded = typeof window.parent !== "undefined" && window.parent !== null && window.parent !== window;
    if (isEmbedded) {
      return new BrowserTransport();
    }
    const hostname = window.location.hostname || "";
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local") || hostname === "[::1]";
    if (isLocalhost) {
      return new MockTransport();
    }
    return new StandaloneTransport();
  }

  // src/sdk/GameSDK.ts
  var GameSDK = class _GameSDK {
    // ── Private Internal Modules ───────────────────────────────────────────────
    _session;
    _data;
    _events;
    _achievements;
    _logger;
    _transport;
    _initialized = false;
    _sessionOver = false;
    _sessionActive = false;
    _config;
    /**
     * Host-provided session ID.
     * Set either at construction time (via `create()` overrides),
     * auto-adopted during `initialize()`,
     * or set at runtime via `adoptSessionId()` before `startSession()` is called.
     * `null` means no host ID has been provided — local generation will be used.
     */
    _hostSessionId = null;
    _hostSessionOrigin = "none";
    // Throttling for report state updates (max 10 calls per second)
    _lastReportTime = 0;
    _throttleTimeout = null;
    _pendingReportData = null;
    // ── Public Getters ─────────────────────────────────────────────────────────
    get version() {
      return SDK_VERSION;
    }
    get config() {
      return this._config;
    }
    // ── Constructor (Private — use GameSDK.create()) ───────────────────────────
    constructor(config, overrides) {
      this._config = Object.freeze({ ...config });
      this._logger = new Logger(config.displayName ?? config.gameSlug);
      this._session = new SessionManager();
      this._data = new GameDataManager();
      this._events = new EventManager();
      this._achievements = new AchievementManager(this._events);
      this._transport = overrides?.transport ?? detectTransport();
      if (overrides?.sessionId && overrides.sessionId.trim() !== "") {
        this._hostSessionId = overrides.sessionId.trim();
        this._hostSessionOrigin = "manual";
        this._logger.info(`Host session ID received at construction: ${this._hostSessionId}`);
      }
    }
    // ── Static Factory ─────────────────────────────────────────────────────────
    static create(config, overrides) {
      if (!config.gameSlug || typeof config.gameSlug !== "string" || config.gameSlug.trim() === "") {
        throw new TypeError("GameSDK.create: config.gameSlug is required and must be a non-empty string");
      }
      if (!config.gameVersion || typeof config.gameVersion !== "string" || config.gameVersion.trim() === "") {
        throw new TypeError("GameSDK.create: config.gameVersion is required and must be a non-empty string");
      }
      return new _GameSDK(config, overrides);
    }
    // ── IGameSDK Implementation ────────────────────────────────────────────────
    isInitialized() {
      return this._initialized;
    }
    initialize() {
      if (this._initialized) {
        this._logger.warn("initialize() called more than once \u2014 ignoring. The SDK may only be initialized once per instance.");
        return;
      }
      this._logger.info(
        `@wacharlo/game-sdk v${SDK_VERSION} | "${this._config.gameSlug}" v${this._config.gameVersion} | ${this._transport.constructor.name}`
      );
      this._transport.initialize();
      if (typeof window !== "undefined") {
        const globalWacha = window.__WACHA__;
        const preloadedId = globalWacha && typeof globalWacha.sessionId === "string" && globalWacha.sessionId.trim() !== "" ? globalWacha.sessionId.trim() : window.__WACHA_SESSION_ID__ && typeof window.__WACHA_SESSION_ID__ === "string" ? window.__WACHA_SESSION_ID__.trim() : null;
        if (preloadedId) {
          this._hostSessionId = preloadedId;
          this._hostSessionOrigin = "window-global";
          this._logger.info(`Host session ID auto-adopted from window global: ${this._hostSessionId}`);
        }
      }
      this._transport.setMessageHandler((msg) => {
        const eventName = msg.event || msg.type;
        if (eventName === "ADOPT_SESSION") {
          const id = msg.payload?.sessionId;
          if (id && typeof id === "string" && id.trim() !== "") {
            if (this._sessionActive) {
              this._logger.error(
                `ADOPT_SESSION message received AFTER startSession() \u2014 running session cannot be modified. Provided ID "${id}" ignored.`
              );
            } else {
              this._hostSessionId = id.trim();
              this._hostSessionOrigin = "transport-message";
              this._logger.info(`Host session ID adopted via transport message: ${this._hostSessionId}`);
            }
          }
          return;
        }
        if (eventName) {
          this._events.emit(eventName, msg.payload);
        }
      });
      const initMsg = this.createMessageEnvelope("INITIALIZE");
      this._transport.send(initMsg);
      this._initialized = true;
    }
    adoptSessionId(sessionId, origin = "manual") {
      if (!this._initialized) {
        this._logger.warn(
          "adoptSessionId() called before initialize(). Call sdk.initialize() first. The session ID was NOT adopted."
        );
        return;
      }
      if (this._sessionActive) {
        this._logger.error(
          `adoptSessionId() called AFTER startSession() \u2014 the running session ID cannot be changed retroactively. Provided ID "${sessionId}" was ignored. To use a host session ID, call adoptSessionId() before startSession().`
        );
        return;
      }
      if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
        this._logger.warn("adoptSessionId() received an empty or invalid session ID \u2014 ignoring.");
        return;
      }
      this._hostSessionId = sessionId.trim();
      this._hostSessionOrigin = origin;
      this._logger.info(`Host session ID adopted (${origin}): ${this._hostSessionId}`);
    }
    startSession() {
      if (!this._initialized) {
        this._logger.warn("startSession() called before initialize(). Call sdk.initialize() first.");
        return;
      }
      if (this._sessionActive) {
        this._logger.warn("startSession() called while a session is already active. Closing the previous session automatically.");
        this._session.end();
      }
      this._session.start(
        this._hostSessionId ?? void 0,
        this._hostSessionId && this._hostSessionOrigin !== "none" ? this._hostSessionOrigin : "generated"
      );
      this._data.reset();
      this._achievements.reset();
      this._sessionOver = false;
      this._sessionActive = true;
      this._pendingReportData = null;
      if (this._throttleTimeout) {
        clearTimeout(this._throttleTimeout);
        this._throttleTimeout = null;
      }
      const msg = this.createMessageEnvelope("GAME_STARTED");
      this._transport.send(msg);
    }
    pause() {
      if (!this._sessionActive) {
        this._logger.warn("pause() called with no active session. Call startSession() first.");
        return;
      }
      const msg = this.createMessageEnvelope("GAME_PAUSED");
      this._transport.send(msg);
    }
    resume() {
      if (!this._sessionActive) {
        this._logger.warn("resume() called with no active session. Call startSession() first.");
        return;
      }
      const msg = this.createMessageEnvelope("GAME_RESUMED");
      this._transport.send(msg);
    }
    gameOver(result) {
      if (!this._sessionActive) {
        this._logger.warn("gameOver() called with no active session.");
        return;
      }
      if (this._sessionOver) {
        this._logger.warn("gameOver() called more than once in the same session \u2014 ignoring. A session can only end once.");
        return;
      }
      this.flushPendingReport();
      this._sessionOver = true;
      this._sessionActive = false;
      if (result?.data) {
        this._data.report(result.data);
      }
      if (result?.score !== void 0) {
        this._data.report({ score: result.score });
      }
      this._session.end();
      const payload = {};
      if (result?.reason) {
        payload.reason = result.reason;
      }
      const msg = this.createMessageEnvelope("GAME_OVER", payload);
      this._transport.send(msg);
    }
    report(data) {
      if (!this._sessionActive) {
        this._logger.warn("report() called with no active session. Call startSession() first.");
        return;
      }
      this._data.report(data);
      this._pendingReportData = {
        ...this._pendingReportData,
        ...data
      };
      const now = Date.now();
      const elapsed = now - this._lastReportTime;
      if (elapsed >= 100) {
        this.sendReportImmediately();
      } else {
        if (!this._throttleTimeout) {
          this._throttleTimeout = setTimeout(() => {
            this.sendReportImmediately();
          }, 100 - elapsed);
        }
      }
    }
    sendReportImmediately() {
      if (this._throttleTimeout) {
        clearTimeout(this._throttleTimeout);
        this._throttleTimeout = null;
      }
      if (!this._sessionActive) {
        this._pendingReportData = null;
        return;
      }
      const msg = this.createMessageEnvelope("DATA_UPDATED");
      this._transport.send(msg);
      this._pendingReportData = null;
      this._lastReportTime = Date.now();
    }
    flushPendingReport() {
      if (this._pendingReportData) {
        this.sendReportImmediately();
      }
    }
    unlockAchievement(id) {
      if (!this._config.supportsAchievements) {
        this._logger.warn(`unlockAchievement("${id}") called but config.supportsAchievements is false \u2014 ignoring.`);
        return;
      }
      if (!this._sessionActive) {
        this._logger.warn("unlockAchievement() called with no active session.");
        return;
      }
      const countBefore = this._achievements.getSessionUnlocks().length;
      this._achievements.unlock(id);
      const countAfter = this._achievements.getSessionUnlocks().length;
      if (countAfter > countBefore) {
        const msg = this.createMessageEnvelope("ACHIEVEMENT_UNLOCKED", { achievementId: id });
        this._transport.send(msg);
      }
    }
    on(event, callback) {
      return this._events.on(event, callback);
    }
    off(event, callback) {
      this._events.off(event, callback);
    }
    dispose() {
      if (this._sessionActive) {
        this._session.end();
      }
      if (this._throttleTimeout) {
        clearTimeout(this._throttleTimeout);
        this._throttleTimeout = null;
      }
      this._pendingReportData = null;
      this._events.clear();
      this._achievements.reset();
      this._data.reset();
      this._transport.destroy();
      this._initialized = false;
      this._sessionActive = false;
      this._sessionOver = false;
      this._logger.info("GameSDK instance disposed.");
    }
    getDiagnostics() {
      const base = this._transport.getDiagnostics(this.version);
      return {
        ...base,
        sessionId: this._session.getId(),
        sessionSource: this._session.getSessionSource(),
        sessionOrigin: this._session.getSessionOrigin(),
        transport: base.activeTransport
      };
    }
    // ── Private Envelope Builder ───────────────────────────────────────────────
    createMessageEnvelope(event, payload) {
      const meta = this._session.getMeta();
      const sessionId = meta?.sessionId ?? "";
      const device = meta?.device ?? {
        type: "desktop",
        os: "Unknown",
        language: "en",
        pixelRatio: 1
      };
      return {
        event,
        type: event,
        gameId: this._config.gameSlug,
        gameVersion: this._config.gameVersion,
        sdkVersion: this.version,
        timestamp: Date.now(),
        sessionId,
        device,
        data: this._data.getLastSnapshot() ?? {},
        payload
      };
    }
  };

  // temp-sdk-entry.ts
  window.GameSDK = GameSDK;
})();
