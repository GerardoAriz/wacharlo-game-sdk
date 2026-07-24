import type { SDKEventType } from '../types/index';
import type { EventCallback } from '../events/IEventManager';
/**
 * IHostManager
 *
 * Public contract for Host communication (`sdk.host`).
 * Handles all event emission from game to Host and event subscriptions from Host to game.
 */
export interface IHostManager {
    /**
     * Emits an event to the Host application using a standardized message envelope.
     * Also notifies any local in-process subscribers.
     *
     * @param event  The SDK event type to emit (e.g. SDKEvent.MATCH_STARTED)
     * @param payload Optional event payload
     * @param roomId  Optional room ID context
     */
    emit<T = unknown>(event: SDKEventType, payload?: T, roomId?: string): void;
    /**
     * Subscribes to host commands or events.
     *
     * @param event    The event type to listen for
     * @param callback Called when the host emits the target event
     * @returns Cleanup function to unsubscribe
     */
    on<T = unknown>(event: SDKEventType, callback: EventCallback<T>): () => void;
    /**
     * Unsubscribes a specific callback from an event.
     */
    off<T = unknown>(event: SDKEventType, callback: EventCallback<T>): void;
    /**
     * Clears all event listeners.
     */
    clear(): void;
}
//# sourceMappingURL=IHostManager.d.ts.map