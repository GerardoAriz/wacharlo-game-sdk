import type { IBridgeAdapter } from './IBridgeAdapter';
import type { SDKMessageType } from '../types/index';
import { Logger } from '../logger/Logger';
import { Transport } from '../transport/Transport';
import { detectTransport } from '../transport/detect';

/**
 * BridgeAdapter
 *
 * Backward-compatibility wrapper around the new Transport abstraction.
 * Existing Phaser or custom integrations that manually interact with BridgeAdapter
 * will continue to work, delegating calls transparently to the active Transport.
 */
export class BridgeAdapter implements IBridgeAdapter {
  protected readonly logger: Logger;
  private readonly transport: Transport;

  constructor(transport?: Transport) {
    this.logger = new Logger(this.constructor.name);
    this.transport = transport ?? detectTransport();
    this.transport.initialize();
  }

  public send(message: SDKMessageType): void {
    this.transport.send(message);
  }

  public setMessageHandler(handler: (message: SDKMessageType) => void): void {
    this.transport.setMessageHandler(handler);
  }

  public destroy(): void {
    this.transport.destroy();
  }
}
