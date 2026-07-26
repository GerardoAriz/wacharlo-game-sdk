import type { IMatchRuleEvaluator, MatchStateSnapshot, MatchEvaluationResult } from '../../types/index';
/**
 * LastAliveRuleEvaluator
 *
 * Stateless, deterministic match rule evaluator for elimination / battle royale games (e.g. Rope Rush).
 *
 * Completion condition: `aliveCount <= (totalPlayers > 1 ? 1 : 0)`
 * Winners: The single remaining survivor, or tie-break by score / last to die if all eliminated simultaneously.
 */
export declare class LastAliveRuleEvaluator implements IMatchRuleEvaluator {
    readonly name = "last_alive";
    isMatchComplete(snapshot: Readonly<MatchStateSnapshot>): boolean;
    evaluateResult(snapshot: Readonly<MatchStateSnapshot>): MatchEvaluationResult;
}
//# sourceMappingURL=LastAliveRuleEvaluator.d.ts.map