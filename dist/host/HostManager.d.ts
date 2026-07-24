import type { IHostManager } from './IHostManager';
import type { EventManager } from '../events/EventManager';
import type { SDKEventType, SDKEventEnvelope } from '../types/index';
import type { EventCallback } from '../events/IEventManager';
export type EnvelopeSender = (envelope: SDKEventEnvelope) => void;
/**
 * HostManager
 *
 * Implementation of `sdk.host`.
 * Manages communication between the Game and the Host platform.
 */
export declare class HostManager implements IHostManager {
    private readonly eventManager;
    private readonly envelopeSender;
    private readonly getSessionId;
    private readonly logger;
    constructor(eventManager: EventManager, envelopeSender: EnvelopeSender, getSessionId: () => string | undefined);
    emit<T = unknown>(event: SDKEventType, payload?: T, roomId?: string): void;
    on<T = unknown>(event: SDKEventType, callback: EventCallback<T>): () => void;
    off<T = unknown>(event: SDKEventType, callback: EventCallback<T>): void;
    clear(): void;
}
//# sourceMappingURL=HostManager.d.ts.map