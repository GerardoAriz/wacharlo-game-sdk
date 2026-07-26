import { describe, it, expect } from 'vitest';
import { HighestScoreRuleEvaluator } from '../../src/host/evaluators/HighestScoreRuleEvaluator';
import { MatchDataAggregator } from '../../src/host/MatchDataAggregator';

describe('HighestScoreRuleEvaluator', () => {
  it('evaluates target score completion', () => {
    const evaluator = new HighestScoreRuleEvaluator({ targetScore: 1000 });
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2']);

    expect(evaluator.isMatchComplete(aggregator.getSnapshot())).toBe(false);

    aggregator.updatePlayerScore('p1', 500);
    expect(evaluator.isMatchComplete(aggregator.getSnapshot())).toBe(false);

    aggregator.updatePlayerScore('p2', 1050);
    expect(evaluator.isMatchComplete(aggregator.getSnapshot())).toBe(true);

    const result = evaluator.evaluateResult(aggregator.getSnapshot());
    expect(result.winners).toEqual(['p2']);
    expect(result.reason).toBe('target_score_reached');
    expect(result.placements[0].playerId).toBe('p2');
    expect(result.placements[0].rank).toBe(1);
    expect(result.placements[0].score).toBe(1050);
  });

  it('ranks tied high scores as co-winners', () => {
    const evaluator = new HighestScoreRuleEvaluator();
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2', 'p3']);

    aggregator.updatePlayerScore('p1', 500);
    aggregator.updatePlayerScore('p2', 500);
    aggregator.updatePlayerScore('p3', 200);

    aggregator.processPlayerDied('p1');
    aggregator.processPlayerDied('p2');
    aggregator.processPlayerDied('p3');

    const snapshot = aggregator.getSnapshot();
    expect(evaluator.isMatchComplete(snapshot)).toBe(true);

    const result = evaluator.evaluateResult(snapshot);
    expect(result.winners).toContain('p1');
    expect(result.winners).toContain('p2');
    expect(result.winners.length).toBe(2);
  });
});
