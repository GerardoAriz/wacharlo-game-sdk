import type { IMatchRuleEvaluator, MatchStateSnapshot, MatchEvaluationResult } from '../../types/index';
export interface HighestScoreRuleOptions {
    targetScore?: number;
}
/**
 * HighestScoreRuleEvaluator
 *
 * Stateless, deterministic match rule evaluator for score-based games.
 *
 * Completion condition: Any player hits targetScore (if specified), or all players eliminated.
 * Winners: Player(s) with highest score.
 */
export declare class HighestScoreRuleEvaluator implements IMatchRuleEvaluator {
    readonly name = "highest_score";
    private readonly targetScore?;
    constructor(options?: HighestScoreRuleOptions);
    isMatchComplete(snapshot: Readonly<MatchStateSnapshot>): boolean;
    evaluateResult(snapshot: Readonly<MatchStateSnapshot>): MatchEvaluationResult;
}
//# sourceMappingURL=HighestScoreRuleEvaluator.d.ts.map