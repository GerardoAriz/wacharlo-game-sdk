import { MatchDataAggregator } from './MatchDataAggregator';
import { LastAliveRuleEvaluator } from './evaluators/LastAliveRuleEvaluator';
import { SDKEvent } from '../types/index';
import { Logger } from '../logger/Logger';
/**
 * HostMatchController
 *
 * Authoritative host-side match controller.
 * Orchestrates player death processing, score updates, match rule evaluation,
 * and guaranteed exact-once `MATCH_FINISHED` event broadcasting to all clients.
 *
 * Fully decoupled from specific game engines and victory rules via `IMatchDataAggregator`
 * and `IMatchRuleEvaluator` abstractions.
 */
export class HostMatchController {
    logger;
    hostManager;
    roomId;
    aggregator;
    ruleEvaluator;
    isMatchFinished = false;
    unsubscribePlayerDied;
    constructor(options) {
        if (!options.hostManager) {
            throw new TypeError('HostMatchController: options.hostManager is required');
        }
        if (!options.roomId || typeof options.roomId !== 'string' || options.roomId.trim() === '') {
            throw new TypeError('HostMatchController: options.roomId is required');
        }
        this.roomId = options.roomId.trim();
        this.hostManager = options.hostManager;
        this.logger = new Logger(`HostMatchController[${this.roomId}]`);
        this.aggregator =
            options.aggregator ?? new MatchDataAggregator(this.roomId, options.playerIds ?? []);
        this.ruleEvaluator = options.ruleEvaluator ?? new LastAliveRuleEvaluator();
        if (options.playerIds && options.playerIds.length > 0) {
            this.aggregator.startMatch(options.playerIds);
        }
        // Subscribe to host PLAYER_DIED events automatically
        this.unsubscribePlayerDied = this.hostManager.on(SDKEvent.PLAYER_DIED, payload => this.handlePlayerDiedEvent(payload));
    }
    getRoomId() {
        return this.roomId;
    }
    isFinished() {
        return this.isMatchFinished;
    }
    getAggregator() {
        return this.aggregator;
    }
    getRuleEvaluator() {
        return this.ruleEvaluator;
    }
    startMatch(playerIds) {
        this.isMatchFinished = false;
        this.aggregator.startMatch(playerIds);
        this.logger.info(`Match started with ${playerIds.length} players`, playerIds);
    }
    handlePlayerDiedEvent(payload) {
        if (!payload || !payload.playerId)
            return;
        // Reject if event belongs to a different room ID
        if (payload.roomId && payload.roomId !== this.roomId) {
            return;
        }
        this.onPlayerDied(payload.playerId, payload.score, payload.timestamp);
    }
    onPlayerDied(playerId, score, timestamp) {
        if (this.isMatchFinished) {
            this.logger.debug(`PLAYER_DIED ignored for ${playerId} — match is already finished.`);
            return false;
        }
        // Exact-once processing check via aggregator
        const processed = this.aggregator.processPlayerDied(playerId, score, timestamp);
        if (!processed) {
            this.logger.warn(`PLAYER_DIED ignored for ${playerId} — duplicate or invalid player.`);
            return false;
        }
        this.logger.info(`PLAYER_DIED processed for ${playerId} (score: ${score ?? 0})`);
        this.evaluateAndCheckCompletion();
        return true;
    }
    onScoreUpdated(playerId, score) {
        if (this.isMatchFinished)
            return;
        this.aggregator.updatePlayerScore(playerId, score);
        this.evaluateAndCheckCompletion();
    }
    forceMatchFinish(overrideReason = 'manual_finish') {
        if (this.isMatchFinished)
            return;
        this.finishMatch(overrideReason);
    }
    dispose() {
        if (this.unsubscribePlayerDied) {
            this.unsubscribePlayerDied();
        }
    }
    evaluateAndCheckCompletion() {
        if (this.isMatchFinished)
            return;
        const snapshot = this.aggregator.getSnapshot();
        const complete = this.ruleEvaluator.isMatchComplete(snapshot);
        if (complete) {
            this.finishMatch();
        }
    }
    finishMatch(overrideReason) {
        // Guaranteed exact-once MATCH_FINISHED broadcast safeguard
        if (this.isMatchFinished)
            return;
        this.isMatchFinished = true;
        const snapshot = this.aggregator.getSnapshot();
        const evaluation = this.ruleEvaluator.evaluateResult(snapshot);
        const payload = {
            roomId: this.roomId,
            winners: evaluation.winners,
            placements: evaluation.placements,
            finalScores: { ...snapshot.finalScores },
            eliminationOrder: [...snapshot.eliminationOrder],
            matchDurationMs: snapshot.durationMs,
            ruleName: evaluation.ruleName,
            reason: overrideReason ?? evaluation.reason,
            completedAt: Date.now(),
        };
        this.logger.info(`MATCH_FINISHED emitted for room ${this.roomId}`, payload);
        // Emit MATCH_FINISHED event to host transport and local listeners
        this.hostManager.emit(SDKEvent.MATCH_FINISHED, payload, this.roomId);
    }
}
//# sourceMappingURL=HostMatchController.js.map