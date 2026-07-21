import { Transport } from './Transport';
import type { SDKMessageType } from '../types/index';

/**
 * StandaloneTransport
 *
 * Handles standard standalone browser execution where no Wacharlo host is present.
 * Operations print diagnostic outputs to the console but do not transmit.
 */
export class StandaloneTransport extends Transport {
  public initialize(): void {
    this.logger.info('StandaloneTransport initialized (standalone browser mode).');
  }

  public send(message: SDKMessageType): void {
    this.messagesSentCount++;
    this.lastSentMessage = message;
    this.logger.info(`[StandaloneTransport] Sent Event: ${message.event}`, message);
  }

  public destroy(): void {
    this.logger.info('StandaloneTransport destroyed.');
  }

  protected isHostDetected(): boolean {
    return false;
  }

  protected getDeliveryMethod(): string {
    return 'console';
  }
}
