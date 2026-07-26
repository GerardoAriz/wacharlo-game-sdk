import type {
  IMatchRuleEvaluator,
  MatchStateSnapshot,
  MatchEvaluationResult,
  PlayerPlacement,
} from '../../types/index';

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
export class HighestScoreRuleEvaluator implements IMatchRuleEvaluator {
  public readonly name = 'highest_score';
  private readonly targetScore?: number;

  constructor(options?: HighestScoreRuleOptions) {
    this.targetScore = options?.targetScore;
  }

  public isMatchComplete(snapshot: Readonly<MatchStateSnapshot>): boolean {
    if (snapshot.players.length === 0) return true;

    if (typeof this.targetScore === 'number' && this.targetScore > 0) {
      const hasHitTarget = snapshot.players.some(p => p.score >= (this.targetScore as number));
      if (hasHitTarget) return true;
    }

    return snapshot.aliveCount === 0;
  }

  public evaluateResult(snapshot: Readonly<MatchStateSnapshot>): MatchEvaluationResult {
    const sorted = [...snapshot.players].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      // Tie-break by death order (last to die first)
      return (b.deathOrder ?? 0) - (a.deathOrder ?? 0);
    });

    const highestScore = sorted[0]?.score ?? 0;
    const winners = sorted.filter(p => p.score === highestScore).map(p => p.playerId);

    let reason = 'highest_score_wins';
    if (typeof this.targetScore === 'number' && highestScore >= this.targetScore) {
      reason = 'target_score_reached';
    } else if (snapshot.aliveCount === 0) {
      reason = 'all_eliminated';
    }

    const placements: PlayerPlacement[] = sorted.map((p, idx) => ({
      playerId: p.playerId,
      rank: idx + 1,
      score: p.score,
      isSurvivor: p.isAlive,
      eliminatedAt: p.diedAt,
      teamId: p.teamId,
    }));

    return {
      winners,
      placements,
      ruleName: this.name,
      reason,
    };
  }
}
