import { Logger } from '../logger/Logger';
/**
 * SessionManager
 *
 * Manages the full lifecycle of a single game session.
 */
export class SessionManager {
    logger = new Logger('SessionManager');
    sessionId = null;
    startedAt = null;
    endedAt = null;
    device = null;
    active = false;
    _sessionSource = 'none';
    _sessionOrigin = 'none';
    start(hostSessionId, origin) {
        if (this.active) {
            this.logger.warn('Session already active — ignoring duplicate start.');
            return;
        }
        if (hostSessionId && typeof hostSessionId === 'string' && hostSessionId.trim() !== '') {
            this.sessionId = hostSessionId.trim();
            this._sessionSource = 'host';
            this._sessionOrigin = origin ?? 'manual';
            this.logger.info('Session started with host-provided ID', {
                sessionId: this.sessionId,
                source: 'host',
                origin: this._sessionOrigin,
            });
        }
        else {
            this.sessionId = this.generateUUID();
            this._sessionSource = 'local';
            this._sessionOrigin = 'generated';
            this.logger.info('Session started with locally-generated ID', {
                sessionId: this.sessionId,
                source: 'local',
                origin: 'generated',
            });
        }
        this.device = this.detectDevice();
        this.startedAt = Date.now();
        this.endedAt = null;
        this.active = true;
    }
    end() {
        if (!this.active) {
            this.logger.warn('No active session to end.');
            return;
        }
        this.endedAt = Date.now();
        this.active = false;
        const duration = this.startedAt ? (this.endedAt - this.startedAt) / 1000 : 0;
        this.logger.info(`Session ended. Duration: ${duration.toFixed(2)}s`, {
            sessionId: this.sessionId,
            source: this._sessionSource,
            origin: this._sessionOrigin,
        });
    }
    getId() {
        return this.sessionId;
    }
    isActive() {
        return this.active;
    }
    getMeta() {
        if (!this.sessionId || !this.startedAt || !this.device) {
            return null;
        }
        const elapsed = this.getElapsedSeconds();
        return {
            sessionId: this.sessionId,
            startedAt: this.startedAt,
            endedAt: this.endedAt || undefined,
            durationSeconds: elapsed,
            device: this.device,
        };
    }
    getElapsedSeconds() {
        if (!this.startedAt) {
            return 0;
        }
        const end = this.endedAt || Date.now();
        return (end - this.startedAt) / 1000;
    }
    getSessionSource() {
        return this._sessionSource;
    }
    getSessionOrigin() {
        return this._sessionOrigin;
    }
    generateUUID() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        // Manual fallback for environments where crypto is unavailable
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    detectDevice() {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return {
                type: 'desktop',
                os: 'Unknown',
                language: 'en',
                pixelRatio: 1,
            };
        }
        const ua = navigator.userAgent || '';
        let type = 'desktop';
        if (/tablet|ipad|playbook|silk/i.test(ua)) {
            type = 'tablet';
        }
        else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
            type = 'mobile';
        }
        let os = 'Unknown';
        if (/Windows/i.test(ua))
            os = 'Windows';
        else if (/Macintosh/i.test(ua))
            os = 'macOS';
        else if (/iPhone|iPad|iPod/i.test(ua))
            os = 'iOS';
        else if (/Android/i.test(ua))
            os = 'Android';
        else if (/Linux/i.test(ua))
            os = 'Linux';
        return {
            type,
            os,
            language: navigator.language || 'en',
            pixelRatio: window.devicePixelRatio || 1,
        };
    }
}
//# sourceMappingURL=SessionManager.js.map