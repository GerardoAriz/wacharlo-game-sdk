import { Transport } from './Transport';
import type { SDKMessageType } from '../types/index';

/**
 * MockTransport
 *
 * Dedicated transport for local development, testing setups, and Node.js test runs.
 * Stores transmitted envelopes in-memory for testing assertions.
 */
export class MockTransport extends Transport {
  public sentMessages: SDKMessageType[] = [];

  public initialize(): void {
    this.logger.info('MockTransport initialized.');
  }

  public send(message: SDKMessageType): void {
    this.messagesSentCount++;
    this.lastSentMessage = message;
    this.sentMessages.push(message);
    this.logger.debug('MockTransport sent message', message);
  }

  /**
   * Test/Mock method to simulate receiving a message from the host.
   */
  public mockReceive(message: SDKMessageType): void {
    this.messagesReceivedCount++;
    if (this.onMessageReceived) {
      this.onMessageReceived(message);
    }
  }

  public destroy(): void {
    this.sentMessages = [];
    this.logger.info('MockTransport destroyed.');
  }

  protected isHostDetected(): boolean {
    return false;
  }

  protected getDeliveryMethod(): string {
    return 'mock';
  }
}
