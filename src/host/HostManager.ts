import type { IHostManager } from './IHostManager';
import type { EventManager } from '../events/EventManager';
import type { SDKEventType, SDKEventEnvelope } from '../types/index';
import type { EventCallback } from '../events/IEventManager';
import { Logger } from '../logger/Logger';

export type EnvelopeSender = (envelope: SDKEventEnvelope) => void;

/**
 * HostManager
 *
 * Implementation of `sdk.host`.
 * Manages communication between the Game and the Host platform.
 */
export class HostManager implements IHostManager {
  private readonly logger = new Logger('HostManager');

  constructor(
    private readonly eventManager: EventManager,
    private readonly envelopeSender: EnvelopeSender,
    private readonly getSessionId: () => string | undefined,
  ) {}

  public emit<T = unknown>(event: SDKEventType, payload?: T, roomId?: string): void {
    const timestamp = Date.now();
    const sessionId = this.getSessionId();

    const envelope: SDKEventEnvelope<T> = {
      event,
      timestamp,
      ...(sessionId ? { sessionId } : {}),
      ...(roomId ? { roomId } : {}),
      ...(payload !== undefined ? { payload } : {}),
    };

    this.logger.debug(`sdk.host.emit [${event}]`, envelope);

    // 1. Dispatch over transport to Host
    try {
      this.envelopeSender(envelope);
    } catch (e) {
      this.logger.error(`Failed to send event envelope for ${event}:`, e);
    }

    // 2. Notify local event subscribers
    this.eventManager.emit(event, payload);
  }

  public on<T = unknown>(event: SDKEventType, callback: EventCallback<T>): () => void {
    return this.eventManager.on(event, callback);
  }

  public off<T = unknown>(event: SDKEventType, callback: EventCallback<T>): void {
    this.eventManager.off(event, callback);
  }

  public clear(): void {
    this.eventManager.clear();
  }
}
