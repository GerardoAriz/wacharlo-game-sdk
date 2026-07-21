import { Transport } from './Transport';
import type { SDKMessageType } from '../types/index';

/**
 * FlutterWebViewTransport
 *
 * Dedicated transport for Flutter WebView execution environments.
 * Uses `window.WachaPlayChannel` or `window.flutter_inappwebview` for outbound
 * messages, and binds `window.receiveWachaPlayMessage` for inbound messages.
 */
export class FlutterWebViewTransport extends Transport {
  public initialize(): void {
    if (typeof window === 'undefined') return;

    // Define the global hook that Flutter calls to deliver messages to the game.
    (window as any).receiveWachaPlayMessage = (message: any) => {
      this.messagesReceivedCount++;
      this.logger.debug('Received message from Flutter host', message);

      if (this.onMessageReceived) {
        try {
          const parsed = typeof message === 'string' ? JSON.parse(message) : message;
          this.onMessageReceived(parsed);
        } catch (e) {
          this.lastError = e instanceof Error ? e.message : String(e);
          this.logger.error('Failed to parse incoming message from Flutter', e);
        }
      }
    };

    this.logger.info('FlutterWebViewTransport initialized successfully.');
  }

  public send(message: SDKMessageType): void {
    if (typeof window === 'undefined') return;

    this.messagesSentCount++;
    this.lastSentMessage = message;

    const messageStr = JSON.stringify(message);

    // 1. Try standard WachaPlayChannel first
    const wachaChannel = (window as any).WachaPlayChannel;
    if (wachaChannel && typeof wachaChannel.postMessage === 'function') {
      try {
        wachaChannel.postMessage(messageStr);
        this.logger.debug('Sent message to Flutter via WachaPlayChannel', message);
      } catch (e) {
        this.lastError = e instanceof Error ? e.message : String(e);
        this.lastFailure = 'WachaPlayChannel_failed';
        this.logger.error('Failed to send via WachaPlayChannel', e);
      }
    }
    // 2. Fall back to flutter_inappwebview
    else {
      const inAppWebView = (window as any).flutter_inappwebview;
      if (inAppWebView && typeof inAppWebView.callHandler === 'function') {
        try {
          inAppWebView.callHandler('WachaPlayChannel', messageStr);
          this.logger.debug('Sent message to Flutter via flutter_inappwebview', message);
        } catch (e) {
          this.lastError = e instanceof Error ? e.message : String(e);
          this.lastFailure = 'flutter_inappwebview_failed';
          this.logger.error('Failed to send via flutter_inappwebview', e);
        }
      } else {
        this.lastError = 'Neither WachaPlayChannel nor flutter_inappwebview is available on window';
        this.lastFailure = 'no_flutter_channel';
        this.logger.warn('Flutter WebView transport failed: no host channels available on window.');
      }
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      try {
        delete (window as any).receiveWachaPlayMessage;
      } catch (e) {
        // Fallback for strict mode or IE/edge compatibility issues
        (window as any).receiveWachaPlayMessage = undefined;
      }
    }
    this.logger.info('FlutterWebViewTransport destroyed.');
  }

  protected isHostDetected(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).WachaPlayChannel || (window as any).flutter_inappwebview);
  }

  protected getDeliveryMethod(): string {
    if (typeof window === 'undefined') return 'none';
    if ((window as any).WachaPlayChannel) return 'window.WachaPlayChannel';
    if ((window as any).flutter_inappwebview) return 'window.flutter_inappwebview';
    return 'none';
  }
}
