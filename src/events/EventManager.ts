import type { IEventManager, EventCallback } from './IEventManager';
import type { SDKEventType } from '../types/index';
import { Logger } from '../logger/Logger';

/**
 * EventManager
 *
 * Concrete implementation of the SDK's internal typed event bus.
 */
export class EventManager implements IEventManager {
  private readonly logger = new Logger('EventManager');
  private readonly listeners = new Map<SDKEventType, Set<EventCallback<any>>>();

  /**
   * Subscribes to an SDK event. Returns a cleanup function.
   */
  public on<T = unknown>(
    event: SDKEventType,
    callback: EventCallback<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribes a specific callback from an event.
   */
  public off<T = unknown>(
    event: SDKEventType,
    callback: EventCallback<T>
  ): void {
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
  public emit<T = unknown>(event: SDKEventType, payload?: T): void {
    const set = this.listeners.get(event);
    this.logger.debug(`Emitting event: ${event}`, payload);

    if (set) {
      // Create a shallow copy to prevent modification issues during iteration
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
  public clear(): void {
    this.listeners.clear();
    this.logger.info('All event listeners cleared.');
  }
}
