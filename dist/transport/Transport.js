import { Logger } from '../logger/Logger';
/**
 * Transport (abstract)
 *
 * Base class for all transport implementations in the Wacharlo Game SDK.
 *
 * Directs communication between the HTML5 game and the Wacharlo host,
 * and maintains telemetry/diagnostics for verification.
 */
export class Transport {
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
            sessionSource: 'none',
            sessionOrigin: 'none',
            transport: this.constructor.name,
        };
    }
    /**
     * Subclasses can report any pending unsent/unacknowledged messages.
     */
    getPendingMessagesCount() {
        return 0;
    }
}
//# sourceMappingURL=Transport.js.map