import type { IHostManager } from './IHostManager';
import type { IMatchDataAggregator, IMatchRuleEvaluator, PlayerDiedPayload } from '../types/index';
export interface HostMatchControllerOptions {
    hostManager: IHostManager;
    roomId: string;
    aggregator?: IMatchDataAggregator;
    ruleEvaluator?: IMatchRuleEvaluator;
    playerIds?: string[];
}
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
export declare class HostMatchController {
    private readonly logger;
    private readonly hostManager;
    private readonly roomId;
    private readonly aggregator;
    private readonly ruleEvaluator;
    private isMatchFinished;
    private readonly unsubscribePlayerDied?;
    constructor(options: HostMatchControllerOptions);
    getRoomId(): string;
    isFinished(): boolean;
    getAggregator(): IMatchDataAggregator;
    getRuleEvaluator(): IMatchRuleEvaluator;
    startMatch(playerIds: string[]): void;
    handlePlayerDiedEvent(payload?: PlayerDiedPayload): void;
    onPlayerDied(playerId: string, score?: number, timestamp?: number): boolean;
    onScoreUpdated(playerId: string, score: number): void;
    forceMatchFinish(overrideReason?: string): void;
    dispose(): void;
    private evaluateAndCheckCompletion;
    private finishMatch;
}
//# sourceMappingURL=HostMatchController.d.ts.map