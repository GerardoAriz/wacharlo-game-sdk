import { Logger } from '../logger/Logger';
/**
 * HostManager
 *
 * Implementation of `sdk.host`.
 * Manages communication between the Game and the Host platform.
 */
export class HostManager {
    eventManager;
    envelopeSender;
    getSessionId;
    logger = new Logger('HostManager');
    constructor(eventManager, envelopeSender, getSessionId) {
        this.eventManager = eventManager;
        this.envelopeSender = envelopeSender;
        this.getSessionId = getSessionId;
    }
    emit(event, payload, roomId) {
        const timestamp = Date.now();
        const sessionId = this.getSessionId();
        const envelope = {
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
        }
        catch (e) {
            this.logger.error(`Failed to send event envelope for ${event}:`, e);
        }
        // 2. Notify local event subscribers
        this.eventManager.emit(event, payload);
    }
    on(event, callback) {
        return this.eventManager.on(event, callback);
    }
    off(event, callback) {
        this.eventManager.off(event, callback);
    }
    clear() {
        this.eventManager.clear();
    }
}
//# sourceMappingURL=HostManager.js.map