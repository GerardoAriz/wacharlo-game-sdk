import type { ISessionManager } from './ISessionManager';
import type { SDKSessionMeta } from '../types/index';
/**
 * SessionManager
 *
 * Manages the full lifecycle of a single game session.
 */
export declare class SessionManager implements ISessionManager {
    private readonly logger;
    private sessionId;
    private startedAt;
    private endedAt;
    private device;
    private active;
    private _sessionSource;
    private _sessionOrigin;
    start(hostSessionId?: string, origin?: 'window-global' | 'transport-message' | 'manual' | 'generated'): void;
    end(): void;
    getId(): string | null;
    isActive(): boolean;
    getMeta(): SDKSessionMeta | null;
    getElapsedSeconds(): number;
    getSessionSource(): 'host' | 'local' | 'none';
    getSessionOrigin(): 'window-global' | 'transport-message' | 'manual' | 'generated' | 'none';
    private generateUUID;
    private detectDevice;
}
//# sourceMappingURL=SessionManager.d.ts.map