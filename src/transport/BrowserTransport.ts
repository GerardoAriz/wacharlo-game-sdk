import { Transport } from './Transport';
import type { SDKMessageType } from '../types/index';

/**
 * BrowserTransport
 *
 * Concrete transport for games running inside an iframe.
 * Communicates with the parent page using `window.parent.postMessage`.
 */
export class BrowserTransport extends Transport {
  private messageListener: ((event: MessageEvent) => void) | null = null;

  public initialize(): void {
    if (typeof window === 'undefined') return;

    this.messageListener = (event: MessageEvent) => {
      const data = event.data;
      // Basic signature validation to check if message conforms to SDKMessageType
      if (data && (data.event || data.type)) {
        this.messagesReceivedCount++;
        this.logger.debug('Received message from parent window via postMessage', data);

        if (this.onMessageReceived) {
          this.onMessageReceived(data);
        }
      }
    };

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('message', this.messageListener);
    }
    this.logger.info('BrowserTransport initialized successfully (iframe mode).');
  }

  public send(message: SDKMessageType): void {
    if (typeof window === 'undefined') return;

    this.messagesSentCount++;
    this.lastSentMessage = message;

    try {
      // In iframe environments, window.parent is the host container.
      window.parent.postMessage(message, '*');
      this.logger.debug('Sent message to parent window', message);
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      this.lastFailure = 'postMessage_failed';
      this.logger.error('Failed to dispatch postMessage to parent window', e);
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined' && this.messageListener) {
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('message', this.messageListener);
      }
      this.messageListener = null;
    }
    this.logger.info('BrowserTransport destroyed.');
  }

  protected isHostDetected(): boolean {
    if (typeof window === 'undefined') return false;
    // An embedded browser run will always have parent !== window.
    return window.parent !== window;
  }

  protected getDeliveryMethod(): string {
    return 'window.parent.postMessage';
  }
}
