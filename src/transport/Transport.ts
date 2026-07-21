import type { SDKMessageType, SDKDiagnostics } from '../types/index';
import { Logger } from '../logger/Logger';

/**
 * Transport (abstract)
 *
 * Base class for all transport implementations in the Wacharlo Game SDK.
 *
 * Directs communication between the HTML5 game and the Wacharlo host,
 * and maintains telemetry/diagnostics for verification.
 */
export abstract class Transport {
  protected readonly logger: Logger;
  protected onMessageReceived?: (message: SDKMessageType) => void;

  protected messagesSentCount = 0;
  protected messagesReceivedCount = 0;
  protected lastSentMessage: SDKMessageType | null = null;
  protected lastError: string | null = null;
  protected lastFailure: string | null = null;
  protected readonly initTime: number;

  constructor() {
    this.logger = new Logger(this.constructor.name);
    this.initTime = Date.now();
  }

  /**
   * Initializes the transport layers (registers listeners, sets up globals, etc.)
   */
  public abstract initialize(): void;

  /**
   * Sends a structured envelope message to the host.
   */
  public abstract send(message: SDKMessageType): void;

  /**
   * Registers a message listener for messages coming from the host.
   */
  public setMessageHandler(handler: (message: SDKMessageType) => void): void {
    this.onMessageReceived = handler;
  }

  /**
   * Clean up resources, event listeners, and globals.
   */
  public abstract destroy(): void;

  /**
   * Returns a copy of transport-specific diagnostics.
   */
  public getDiagnostics(sdkVersion: string): SDKDiagnostics {
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
   * Subclasses define whether they detect a valid host environment.
   */
  protected abstract isHostDetected(): boolean;

  /**
   * Subclasses define the concrete delivery medium name.
   */
  protected abstract getDeliveryMethod(): string;

  /**
   * Subclasses can report any pending unsent/unacknowledged messages.
   */
  protected getPendingMessagesCount(): number {
    return 0;
  }
}
