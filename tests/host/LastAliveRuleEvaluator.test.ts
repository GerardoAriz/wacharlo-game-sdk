import { describe, it, expect } from 'vitest';
import { LastAliveRuleEvaluator } from '../../src/host/evaluators/LastAliveRuleEvaluator';
import { MatchDataAggregator } from '../../src/host/MatchDataAggregator';

describe('LastAliveRuleEvaluator', () => {
  const evaluator = new LastAliveRuleEvaluator();

  it('evaluates incomplete match when 2+ players are alive in multi-player match', () => {
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2', 'p3']);
    const snapshot = aggregator.getSnapshot();

    expect(evaluator.isMatchComplete(snapshot)).toBe(false);
  });

  it('evaluates match complete when 1 survivor remains in 2+ player match', () => {
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2', 'p3']);
    aggregator.processPlayerDied('p2', 100);
    aggregator.processPlayerDied('p3', 150);

    const snapshot = aggregator.getSnapshot();
    expect(evaluator.isMatchComplete(snapshot)).toBe(true);

    const result = evaluator.evaluateResult(snapshot);
    expect(result.winners).toEqual(['p1']);
    expect(result.ruleName).toBe('last_alive');
    expect(result.reason).toBe('last_survivor');
    expect(result.placements.length).toBe(3);

    // p1 is 1st place survivor
    expect(result.placements[0]).toEqual({
      playerId: 'p1',
      rank: 1,
      score: 0,
      isSurvivor: true,
      teamId: undefined,
    });

    // p3 died 2nd (higher elimination order than p2 who died 1st)
    expect(result.placements[1].playerId).toBe('p3');
    expect(result.placements[1].rank).toBe(2);

    expect(result.placements[2].playerId).toBe('p2');
    expect(result.placements[2].rank).toBe(3);
  });

  it('handles simultaneous elimination (0 survivors)', () => {
    const aggregator = new MatchDataAggregator('ROOM-1', ['p1', 'p2']);
    aggregator.processPlayerDied('p1', 50);
    aggregator.processPlayerDied('p2', 200); // p2 died last with higher score

    const snapshot = aggregator.getSnapshot();
    expect(evaluator.isMatchComplete(snapshot)).toBe(true);

    const result = evaluator.evaluateResult(snapshot);
    expect(result.winners).toEqual(['p2']);
    expect(result.reason).toBe('all_eliminated');
    expect(result.placements[0].playerId).toBe('p2');
  });

  it('evaluates 1-player match complete when player dies', () => {
    const aggregator = new MatchDataAggregator('ROOM-SOLO', ['p1']);
    expect(evaluator.isMatchComplete(aggregator.getSnapshot())).toBe(false);

    aggregator.processPlayerDied('p1', 500);
    expect(evaluator.isMatchComplete(aggregator.getSnapshot())).toBe(true);
  });
});
